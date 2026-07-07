const _ = require('lodash');
const utils = require('@strapi/utils');
const { yup, validateYupSchema } = utils;
const { ApplicationError, ValidationError, ForbiddenError } = utils.errors;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const issue = (payload, jwtOptions = {}) => {
  _.defaults(jwtOptions, strapi.config.get('plugin::users-permissions.jwt'));
  return jwt.sign(
    _.clone(payload.toJSON ? payload.toJSON() : payload),
    strapi.config.get('plugin::users-permissions.jwtSecret'),
    jwtOptions
  );
};

const callbackSchema = yup.object({
  identifier: yup.string().required(),
  password: yup.string().required(),
});
const validateCallbackBody = validateYupSchema(callbackSchema);

const sanitizeUser = (user, ctx) => {
  const { auth } = ctx.state;
  const userSchema = strapi.getModel('plugin::users-permissions.user');
  return strapi.contentAPI.sanitize.output(user, userSchema, { auth });
};

const validatePassword = (password, hash) => bcrypt.compare(password, hash);

module.exports = (plugin) => {
    const rawAuth = plugin.controllers.auth({ strapi });

    const customAuth = ({ strapi }) => ({
    ...rawAuth,

    async callback(ctx) {
      const provider = ctx.params.provider || 'local';
      const params = ctx.request.body;

      const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
      const grantSettings = await store.get({ key: 'grant' });
      const grantProvider = provider === 'local' ? 'email' : provider;

      if (!_.get(grantSettings, [grantProvider, 'enabled'])) {
        throw new ApplicationError('This provider is disabled');
      }

      if (provider === 'local') {
        await validateCallbackBody(params);
        const { identifier } = params;

        const user = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: {
            $or: [
              { email: identifier.toLowerCase() },
              { username: identifier },
            ],
          },
          select: ['id', 'username', 'email', 'password', 'confirmed', 'blocked', 'ahiIkMember', 'institutionManagementMember'], // ahiIkMember ve institutionManagementMember eklendi
        });

        if (!user || !user.password) {
          throw new ValidationError('Invalid identifier or password');
        }

        const validPassword = await validatePassword(params.password, user.password);

        if (!validPassword) {
          throw new ValidationError('Invalid identifier or password');
        }

        const advancedSettings = await store.get({ key: 'advanced' });
        const requiresConfirmation = _.get(advancedSettings, 'email_confirmation');

        if (requiresConfirmation && user.confirmed !== true) {
          throw new ApplicationError('Your account email is not confirmed');
        }

        // blocked kontrolü kaldırıldı - AHİ-İK şirketleri (blocked=true) de login yapabilmeli
        // blocked sadece frontend'de menü erişimi için kullanılır

        const sanitizedUser = await sanitizeUser(user, ctx);
        
        return ctx.send({
          jwt: issue({ id: user.id }),
          user: {
            ...sanitizedUser,
            blocked: user.blocked, // Login engelleme için
            ahiIkMember: user.ahiIkMember || false, // AHİ-İK menüsü için
            institutionManagementMember: user.institutionManagementMember || false, // Kurum Yönetimi menüsü için
          },
        });
      }

      const user = await strapi.plugin('users-permissions').services.providers.connect(provider, ctx.query);

      // blocked kontrolü kaldırıldı - AHİ-İK şirketleri de login yapabilmeli

      const sanitizedUser = await sanitizeUser(user, ctx);
      
      return ctx.send({
        jwt: issue({ id: user.id }),
        user: {
          ...sanitizedUser,
          blocked: user.blocked, // Login engelleme için
          ahiIkMember: user.ahiIkMember || false, // AHİ-İK menüsü için
          institutionManagementMember: user.institutionManagementMember || false, // Kurum Yönetimi menüsü için
        },
      });
    },
  });

  plugin.controllers.auth = customAuth;

  plugin.controllers.user = {
    async me(ctx) {
      const user = ctx.state.user;
      if (!user) {
        return ctx.badRequest(null, [{ messages: [{ id: 'No user found' }] }]);
      }
      // role'ü populate ederek döndür (panel yönlendirmesi role.type'a bağlı)
      const fullUser = await strapi.documents('plugin::users-permissions.user').findOne({
        documentId: user.documentId,
        populate: { role: true },
      });
      const sanitized = await sanitizeUser(fullUser || user, ctx);
      // sanitize bazı rollerde (ör. worker) role ilişkisini kırpabiliyor;
      // panel yönlendirmesi role.type'a bağlı olduğu için garanti altına al
      ctx.body = { ...sanitized, role: fullUser?.role || sanitized.role };
    },
    async find(ctx) {
        const { query } = ctx;

        const users = await strapi.documents('plugin::users-permissions.user').findMany({
            filters: query.filters || {},
            fields: ['id', 'documentId', 'username', 'email', 'blocked', 'confirmed', 'ahiIkMember', 'institutionManagementMember'],
            populate: {
                role: {
                    fields: ['id', 'name']
                }
            }
        });

        if (query.populate) {
            const populateFields = Array.isArray(query.populate) 
                ? query.populate 
                : [query.populate];

            if (populateFields.includes('companyProfile')) {
                for (let user of users) {

                    const companyProfile = await strapi.documents('api::company-profile.company-profile').findMany({
                        fields: ['id', 'companyName'],
                        filters: { owner: user.id },
                        populate: {
                            logo: {
                                fields: ['url']
                            },
                            sector: {
                                fields: ['id', 'name']
                            }
                        }
                    });
                    
                    user.companyProfile = companyProfile[0] || null;
                }
            }
        }

        return { data: users };
    },
    async findOne(ctx) {
        const { id: documentId } = ctx.params;
        const { query } = ctx;

        const user = await strapi.documents('plugin::users-permissions.user').findOne({
            documentId: documentId,
            fields: ['id', 'username', 'email', 'blocked', 'confirmed', 'ahiIkMember', 'institutionManagementMember'],
            populate: { role: true },
        });

        if (!user) {
            return ctx.notFound('User not found');
        }

        if (query.populate) {
            const populateFields = Array.isArray(query.populate) ? query.populate : [query.populate];

            if (populateFields.includes('companyProfile')) {
                const companyProfile = await strapi.documents('api::company-profile.company-profile').findMany({
                    fields: ['companyName'],
                    filters: { owner: user.id },
                    populate: { logo: { fields: ['url'] }, sector: { fields: ['id', 'name'] } },
                });
                user.companyProfile = companyProfile[0];
            }
        }

        return { data: user };
    },
    async create(ctx) {
        const { data: input } = ctx.request.body;

        const createdUser = await strapi.documents('plugin::users-permissions.user').create({
            data: input,
            populate: { role: { fields: ['id', 'name', 'type'] } },
        });

        let companyProfile = null;

        if (createdUser.role?.type === 'authenticated') {
            companyProfile = await strapi.documents('api::company-profile.company-profile').create({
                data: {
                    email: createdUser.email,
                    companyName: input.companyName || createdUser.username,
                    owner: createdUser.id,
                },
            });
        }

        const responseData = {
            ...createdUser,
            companyProfile,
        };

        return await sanitizeUser(responseData, ctx);
    },
    async update(ctx) {
        const { id: documentId } = ctx.params;
        const { companyProfile, ...userData } = ctx.request.body;

        const updatedUser = await strapi.documents('plugin::users-permissions.user').update({
            documentId,
            data: userData,
        });
      
        let updatedCompanyProfile = null;
        if (companyProfile) {
            const companyProfileList = await strapi.documents('api::company-profile.company-profile').findMany({
                filters: { owner: updatedUser.id },
                limit: 1,
            });

            if (companyProfileList?.length > 0) {
                updatedCompanyProfile = await strapi.documents('api::company-profile.company-profile').update({
                    documentId: companyProfileList[0].documentId,
                    data: {
                        companyName: companyProfile.companyName,
                        logo: companyProfile.logo || null,
                        sector: companyProfile.sector || null,
                    },
                });
            } else {
                // Company profile yoksa oluştur
                updatedCompanyProfile = await strapi.documents('api::company-profile.company-profile').create({
                    data: {
                        email: updatedUser.email,
                        companyName: companyProfile.companyName || updatedUser.username,
                        logo: companyProfile.logo || null,
                        sector: companyProfile.sector || null,
                        owner: updatedUser.id,
                    },
                });
            }
        }

        const sanitized = await sanitizeUser(updatedUser, ctx);
      
        return {
          data: {
            ...sanitized,
            companyProfile: updatedCompanyProfile,
          },
        };
    },
    async destroy(ctx) {
        const { id: documentId } = ctx.params;
    
        const user = await strapi.documents('plugin::users-permissions.user').findOne({
            documentId,
            fields: ['id'],
        });
    
        if (!user) {
            return ctx.notFound('User not found');
        }
    
        const userId = user.id;
    
        const companyProfiles = await strapi.documents('api::company-profile.company-profile').findMany({
            filters: { owner: userId },
        });

        if (companyProfiles?.length > 0) {
            const companyProfile = companyProfiles[0];

            await strapi.documents('api::company-profile.company-profile').delete({
                documentId: companyProfile.documentId,
            });
        }
    
        const deletedUser = await strapi.documents('plugin::users-permissions.user').delete({
            documentId
        });
    
        return { data: deletedUser };
    },
    async count(ctx) {
        const { query } = ctx;
        const count = await strapi.documents('plugin::users-permissions.user').count({
            filters: query.filters || {}
        });
        return { count };
    }
  };

  return plugin;
};
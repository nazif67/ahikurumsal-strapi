'use strict';
/**
 * company-profile controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController(
  "api::company-profile.company-profile",
  ({ strapi }) => ({
    async find(ctx) {
      const { user } = ctx.state;

      if (user?.role?.name === "Employee") {
        return await super.find(ctx);
      }

      if (!user) {
        const { pagination = {} } = ctx.query
        const page = parseInt(pagination.page) || 1
        const pageSize = parseInt(pagination.pageSize) || 10
  
        const entries = await strapi.db.query('api::company-profile.company-profile').findMany({
          select: ['companyName', 'city', 'district', 'companyAbout', 'email'],
          populate: {
            logo: { select: ['url'] },
            sector: { select: ['name'] },
          },
          pagination: {
            page,
            pageSize,
          },
          orderBy: { companyName: 'asc' },
        })
  
        // Calculate jobCount for each company and filter out those with jobCount = 0
        const companiesWithJobCount = await Promise.all(
          entries.map(async (company) => {
            const jobCount = await strapi.db.query('api::job-listing.job-listing').count({
              where: {
                company: company.id,
                jobStatus: 'Active',
              },
            })
            return jobCount > 0 ? { ...company, jobCount } : null
          })
        )
  
        const filteredCompanies = companiesWithJobCount.filter(company => company !== null)
  
        // Calculate pagination metadata
        const total = filteredCompanies.length // Approximate total after filtering
        const pageCount = Math.ceil(total / pageSize)
  
        ctx.body = {
          data: filteredCompanies,
          meta: {
            pagination: {
              page,
              pageSize,
              pageCount: Math.max(1, pageCount), // Ensure at least 1 page
              total,
            },
          },
        }
      } else {
        const entries = await strapi.db
          .query("api::company-profile.company-profile")
          .findMany({
            where: { owner: user.id },
            populate: ["logo", "owner", "sector"],
          })
  
        ctx.body = { data: entries }
      }
    },

    async findOne(ctx) {
      const { user } = ctx.state;
      const { id } = ctx.params;

      const company = await strapi.db
        .query("api::company-profile.company-profile")
        .findOne({
          where: { id: +id },
          populate: ["owner", "logo", "sector"],
        });

      if (!company) return ctx.notFound("Şirket bulunamadı");

      if (user?.role?.name !== "Employee" && company.owner?.id !== user.id) {
        return ctx.unauthorized("Bu şirkete erişim yetkiniz yok");
      }

      ctx.body = { data: company };
    },

    async public(ctx) {
      const { companyId } = ctx.params
      const { user } = ctx.state
  
      const company = await strapi.db.query('api::company-profile.company-profile').findOne({
        where: { id: +companyId },
        select: ['companyName', 'city', 'district', 'companyAbout', 'email'],
        populate: {
          logo: { select: ['url'] },
          sector: { select: ['name'] },
          companyGallery: { select: ['url'] },
          owner: { select: ['id'] },
        },
      })
  
      if (!company) return ctx.notFound('Şirket bulunamadı')
  
      // Calculate jobCount
      const jobCount = await strapi.db.query('api::job-listing.job-listing').count({
        where: {
          company: company.id,
          jobStatus: 'Active',
        },
      })
  
      ctx.body = { data: { ...company, jobCount } }
    },

    async create(ctx) {
      const { user } = ctx.state;

      if (user.role.name !== "Employee") {
        const existing = await strapi.db
          .query("api::company-profile.company-profile")
          .findOne({
            where: { owner: user.id },
          });

        if (existing) {
          return ctx.badRequest("Zaten bir şirket profiline sahipsiniz.");
        }

        ctx.request.body.data.owner = user.id;
      }

      const entry = await strapi.db
        .query("api::company-profile.company-profile")
        .create({
          data: ctx.request.body.data,
        });

      ctx.body = { data: entry };
    },

    async update(ctx) {
      const { user } = ctx.state;
      const { id } = ctx.params;

      const company = await strapi.db
        .query("api::company-profile.company-profile")
        .findOne({
          where: { id: +id },
          populate: ["owner"],
        });

      if (!company) return ctx.notFound("Şirket bulunamadı");

      if (user.role.name !== "Employee" && company.owner?.id !== user.id) {
        return ctx.unauthorized("Bu şirketi güncelleme yetkiniz yok");
      }

      const updated = await strapi.db
        .query("api::company-profile.company-profile")
        .update({
          where: { id: +id },
          data: ctx.request.body.data,
        });

      ctx.body = { data: updated };
    },

    async delete(ctx) {
      const { user } = ctx.state;
      const { id } = ctx.params;

      if (user.role.name !== "Employee") {
        return ctx.unauthorized("Şirket silme yetkiniz yok");
      }

      const deleted = await strapi.db
        .query("api::company-profile.company-profile")
        .delete({
          where: { id: +id },
        });

      ctx.body = { data: deleted };
    },

    async freeze(ctx) {
      const { user } = ctx.state;
      const { id } = ctx.params;

      if (user.role.name !== "Employee") {
        return ctx.unauthorized("Şirket dondurma yetkiniz yok");
      }

      const company = await strapi.db
        .query("api::company-profile.company-profile")
        .findOne({
          where: { id: +id },
        });

      if (!company) return ctx.notFound("Şirket bulunamadı");

      const updated = await strapi.db
        .query("api::company-profile.company-profile")
        .update({
          where: { id: +id },
          data: { isFrozen: !company.isFrozen },
        });

      ctx.body = { data: updated };
    },
  })
);

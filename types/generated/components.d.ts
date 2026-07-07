import type { Schema, Struct } from '@strapi/strapi';

export interface AracSss extends Struct.ComponentSchema {
  collectionName: 'components_arac_sss';
  info: {
    description: 'S\u0131k\u00E7a sorulan soru ve cevab\u0131';
    displayName: 'SSS \u00D6gesi';
    icon: 'question';
  };
  attributes: {
    cevap: Schema.Attribute.Text & Schema.Attribute.Required;
    soru: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_faq_items';
  info: {
    displayName: 'FAQ Item';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    i18n: {
      localized: false;
    };
  };
  attributes: {
    answer: Schema.Attribute.String;
    question: Schema.Attribute.String;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seo';
  info: {
    description: 'SEO meta bilgileri';
    displayName: 'SEO';
    icon: 'search';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    i18n: {
      localized: false;
    };
  };
  attributes: {
    canonicalURL: Schema.Attribute.String;
    metaDescription: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    metaImage: Schema.Attribute.Media<'images'>;
    metaKeywords: Schema.Attribute.Text;
    metaRobots: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'index, follow'>;
    metaTitle: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'arac.sss': AracSss;
      'shared.faq-item': SharedFaqItem;
      'shared.seo': SharedSeo;
    }
  }
}

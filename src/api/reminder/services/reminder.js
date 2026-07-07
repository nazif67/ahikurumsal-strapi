'use strict';

/**
 * reminder service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::reminder.reminder', ({ strapi }) => ({
  /**
   * Send WhatsApp message
   * This is a basic implementation. For production, you should integrate with a real WhatsApp API service
   * like Twilio, WhatsApp Business API, or a similar service.
   */
  async sendWhatsAppMessage(reminder) {
    try {
      // Format phone number (ensure it starts with country code)
      let phoneNumber = reminder.phoneNumber;
      if (!phoneNumber) {
        return {
          success: false,
          message: 'Telefon numarası belirtilmemiş'
        };
      }

      // Remove spaces and special characters
      phoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
      
      // If number starts with 0, replace with +90 for Turkey
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '+90' + phoneNumber.substring(1);
      } else if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+90' + phoneNumber;
      }

      // Prepare message
      const message = reminder.message || `Anımsatıcı: ${reminder.title}\n${reminder.description || ''}\nTarih: ${new Date(reminder.reminderDate).toLocaleDateString('tr-TR')}`;

      // Log the message (for development/testing)
      console.log('WhatsApp Message to send:');
      console.log('Phone:', phoneNumber);
      console.log('Message:', message);

      // TODO: Integrate with actual WhatsApp API service
      // Example with Twilio (uncomment and configure when ready):
      /*
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const client = require('twilio')(accountSid, authToken);
      
      const twilioMessage = await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        body: message,
        to: `whatsapp:${phoneNumber}`
      });
      
      return {
        success: true,
        message: 'WhatsApp mesajı başarıyla gönderildi',
        messageId: twilioMessage.sid
      };
      */

      // For now, return success with a note that this is a mock implementation
      return {
        success: true,
        message: `WhatsApp mesajı hazırlandı (Test Modu). Telefon: ${phoneNumber}`,
        note: 'Gerçek WhatsApp entegrasyonu için Twilio veya WhatsApp Business API yapılandırılmalıdır'
      };

    } catch (error) {
      console.error('WhatsApp service error:', error);
      return {
        success: false,
        message: 'WhatsApp mesajı gönderilirken bir hata oluştu: ' + error.message
      };
    }
  }
}));



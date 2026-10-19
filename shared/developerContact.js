const phone = "01283865399";
const internationalPhone = `20${phone.slice(1)}`;

export const developerContact = Object.freeze({
  phone,
  whatsappUrl: `https://wa.me/${internationalPhone}`,
  telegramUrl: `https://t.me/+${internationalPhone}`,
});

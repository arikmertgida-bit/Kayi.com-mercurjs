/**
 * Apply Turkish translations for all new keys.
 * Run: node apply-tr-translations.js
 */
const fs = require('fs');

function setDeep(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  const last = parts[parts.length - 1];
  cur[last] = value; // Always overwrite for TR
}

// ===== ADMIN tr.json =====
const adminTrPath = 'c:/Kayı.com/admin-panel/src/i18n/translations/tr.json';
const adminTr = JSON.parse(fs.readFileSync(adminTrPath, 'utf8'));

const adminTrKeys = {
  'general.loading': 'Yükleniyor...',
  'attributes.detail.notFound': 'Özellik bulunamadı',
  'attributes.detail.possibleValues': 'Olası Değerler',
  'attributes.create.enterValue': 'Değer girin',
  'attributes.possibleValues.search': 'Olası değerleri ara...',
  'fields.required': 'Zorunlu',
  'fields.productCategories': 'Ürün Kategorileri',
  'fields.height': 'Yükseklik',
  'fields.width': 'Genişlik',
  'fields.length': 'Uzunluk',
  'fields.weight': 'Ağırlık',
  'fields.midCode': 'Orta Kod',
  'fields.hsCode': 'HS Kodu',
  'fields.countryOfOrigin': 'Menşe Ülkesi',
  'fields.sku': 'SKU',
  'fields.variants': 'Varyantlar',
  'fields.options': 'Seçenekler',
  'labels.selectType': 'Tip seçin',
  'labels.selectOperator': 'Operatör seçin',
  'labels.selectValue': 'Değer seçin',
  'labels.selectValues': 'Değerler seçin',
  'promotions.templates.amountOffProducts.title': 'Ürünlerde tutar indirimi',
  'promotions.templates.amountOffProducts.description': 'Seçili ürün veya ürün koleksiyonlarına indirim uygula',
  'promotions.templates.amountOffOrder.title': 'Sipariş tutarında indirim',
  'promotions.templates.amountOffOrder.description': 'Toplam sipariş tutarına indirim uygula',
  'promotions.templates.percentageOffProduct.title': 'Ürünlerde yüzde indirimi',
  'promotions.templates.percentageOffProduct.description': 'Seçili ürünlerde yüzde indirim uygula',
  'promotions.templates.percentageOffOrder.title': 'Siparişte yüzde indirimi',
  'promotions.templates.percentageOffOrder.description': 'Toplam sipariş tutarında yüzde indirim uygula',
  'promotions.templates.buyXGetY.title': 'X Al Y Kazan',
  'promotions.templates.buyXGetY.description': 'X ürün satın al, Y ürün kazan',
  'promotions.templates.freeShipping.title': 'Ücretsiz kargo',
  'promotions.templates.freeShipping.description': 'Kargo ücretlerine %100 indirim uygula',
  'promotions.campaign.notPartOf': 'Kampanyaya dahil değil',
  'promotions.campaign.addToExisting': 'Bu promosyonu mevcut bir kampanyaya ekle',
  'promotions.campaign.addToCampaign': 'Kampanyaya Ekle',
  'requests.detail.accept': 'Kabul Et',
  'requests.detail.reject': 'Reddet',
  'requests.detail.variants': 'Varyantlar',
  'requests.detail.options': 'Seçenekler',
  'requests.detail.organization': 'Organizasyon',
  'requests.detail.attributes': 'Özellikler',
  'sellers.invite.action': 'Davet Et',
  'sellers.invite.title': 'Satıcı Davet Et',
  'sellers.invite.description': 'Mağazanıza yeni bir satıcı davet edin',
  'sellers.invite.success': 'Davet gönderildi!',
  'sellers.invite.error': 'Hata!',
  'sellers.activate': 'Hesabı Aktifleştir',
  'sellers.suspend': 'Hesabı Askıya Al',
  'sellers.activateConfirm': 'Bu hesabı aktifleştirmek istediğinizden emin misiniz?',
  'sellers.suspendConfirm': 'Bu hesabı askıya almak istediğinizden emin misiniz?',
  'sellers.stockLocations.heading': 'Stok Konumları',
  'sellers.stockLocations.assign': 'Ata',
  'sellers.stockLocations.removeTitle': 'Stok konumunu kaldır',
  'sellers.stockLocations.removeDesc': '"{{name}}" bu satıcıdan kaldırılsın mı? Satıcı artık bu konumdaki stoğu yönetemeyecek.',
  'sellers.stockLocations.removeSuccess': 'Stok konumu kaldırıldı',
  'sellers.stockLocations.removeError': 'Stok konumu kaldırılamadı',
  'sellers.stockLocations.assignSuccess': 'Stok konumu atandı',
  'sellers.stockLocations.assignError': 'Stok konumu atanamadı',
  'sellers.customerGroups.deleteDesc': '{{name}} müşteri grubunu silmek üzeresiniz. Bu işlem geri alınamaz.',
  'sellers.customerGroups.deleteSuccess': 'Müşteri grubu başarıyla silindi',
  'sellers.customerGroups.deleteSuccessDesc': '{{name}} başarıyla silindi',
  'sellers.customerGroups.deleteError': 'Müşteri grubu silinirken hata',
  'sellers.customerGroups.deleteErrorDesc': 'Lütfen daha sonra tekrar deneyin',
  'views.viewName': 'Görünüm Adı',
  'views.enterViewName': 'Görünüm adı girin',
  'views.editViewName': 'Görünüm Adını Düzenle',
  'views.saveAsNewView': 'Yeni Görünüm Olarak Kaydet',
  'views.changeViewName': 'Kaydedilen görünümünüzün adını değiştirin',
  'views.saveConfiguration': 'Mevcut yapılandırmanızı yeni bir görünüm olarak kaydedin',
  'views.nameRequired': 'Ad zorunludur',
  'views.nameNotEmpty': 'Ad boş olamaz',
  'views.saveAsSystemDefault': 'Sistem varsayılanı olarak kaydet',
  'views.saveAsSystemDefaultDesc': 'Bu, mevcut yapılandırmayı sistem varsayılanı olarak kaydeder. Kendi kişisel görünümleri olmayan tüm kullanıcılar bu yapılandırmayı varsayılan olarak görecek. Emin misiniz?',
  'views.updateExistingView': 'Mevcut görünümü güncelle',
  'views.updateExistingViewDesc': '"{{name}}" mevcut yapılandırmayla güncellensin mi?',
  'views.update': 'Güncelle',
  'views.saveAsDefaultBtn': 'Varsayılan olarak kaydet',
  'views.default': 'Varsayılan',
  'views.updateDefaultView': 'Varsayılan görünümü güncelle',
  'views.updateDefaultViewDesc': 'Bu, tüm kullanıcılar için varsayılan görünümü güncelleyecek. Emin misiniz?',
  'views.updateDefaultForEveryone': 'Herkes için varsayılanı güncelle',
  'views.updateConfirmText': 'Herkes için güncelle',
};

for (const [k, v] of Object.entries(adminTrKeys)) setDeep(adminTr, k, v);
fs.writeFileSync(adminTrPath, JSON.stringify(adminTr, null, 2) + '\n', 'utf8');
console.log('admin tr.json updated');

// ===== VENDOR tr.json =====
const vendorTrPath = 'c:/Kayı.com/vendor-panel/src/i18n/translations/tr.json';
const vendorTr = JSON.parse(fs.readFileSync(vendorTrPath, 'utf8'));

const vendorTrKeys = {
  'general.loading': 'Yükleniyor...',
  'fields.required': 'Zorunlu',
  'fields.productCategories': 'Ürün Kategorileri',
  'fields.height': 'Yükseklik',
  'fields.width': 'Genişlik',
  'fields.length': 'Uzunluk',
  'fields.weight': 'Ağırlık',
  'fields.sku': 'SKU',
  'fields.variants': 'Varyantlar',
  'fields.options': 'Seçenekler',
  'labels.selectOperator': 'Operatör seçin',
  'labels.selectValue': 'Değer seçin',
  'labels.selectValues': 'Değerler seçin',
  'promotions.templates.percentageOffProduct.title': 'Ürünlerde yüzde indirimi',
  'promotions.templates.percentageOffProduct.description': 'Seçili ürünlerde yüzde indirim uygula',
  'promotions.templates.percentageOffOrder.title': 'Siparişte yüzde indirimi',
  'promotions.templates.percentageOffOrder.description': 'Toplam sipariş tutarında yüzde indirim uygula',
  'promotions.templates.buyXGetY.title': 'X Al Y Kazan',
  'promotions.templates.buyXGetY.description': 'X ürün satın al, Y ürün kazan',
  'promotions.campaign.notPartOf': 'Kampanyaya dahil değil',
  'promotions.campaign.addToExisting': 'Bu promosyonu mevcut bir kampanyaya ekle',
  'promotions.campaign.addToCampaign': 'Kampanyaya Ekle',
  'locations.shippingOptions.typeDescription': 'Tür açıklaması',
  'views.viewName': 'Görünüm Adı',
  'views.enterViewName': 'Görünüm adı girin',
  'views.editViewName': 'Görünüm Adını Düzenle',
  'views.saveAsNewView': 'Yeni Görünüm Olarak Kaydet',
  'views.changeViewName': 'Kaydedilen görünümünüzün adını değiştirin',
  'views.saveConfiguration': 'Mevcut yapılandırmanızı yeni bir görünüm olarak kaydedin',
  'views.nameRequired': 'Ad zorunludur',
  'views.nameNotEmpty': 'Ad boş olamaz',
  'views.saveAsSystemDefault': 'Sistem varsayılanı olarak kaydet',
  'views.saveAsSystemDefaultDesc': 'Bu, mevcut yapılandırmayı sistem varsayılanı olarak kaydeder. Emin misiniz?',
  'views.updateExistingView': 'Mevcut görünümü güncelle',
  'views.updateExistingViewDesc': '"{{name}}" mevcut yapılandırmayla güncellensin mi?',
  'views.update': 'Güncelle',
  'views.saveAsDefaultBtn': 'Varsayılan olarak kaydet',
  'views.default': 'Varsayılan',
};

for (const [k, v] of Object.entries(vendorTrKeys)) setDeep(vendorTr, k, v);
fs.writeFileSync(vendorTrPath, JSON.stringify(vendorTr, null, 2) + '\n', 'utf8');
console.log('vendor tr.json updated');

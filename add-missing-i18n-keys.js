/**
 * Add all new i18n keys needed for complete translation coverage.
 * Run: node add-missing-i18n-keys.js
 */
const fs = require('fs');
const path = require('path');

function setDeep(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  const last = parts[parts.length - 1];
  // Only set if not already present (don't overwrite existing keys)
  if (cur[last] === undefined) cur[last] = value;
}

// ===== ADMIN en.json =====
const adminPath = 'c:/Kayı.com/admin-panel/src/i18n/translations/en.json';
const admin = JSON.parse(fs.readFileSync(adminPath, 'utf8'));

const adminKeys = {
  'general.loading': 'Loading...',
  'attributes.detail.notFound': 'Attribute not found',
  'attributes.detail.possibleValues': 'Possible Values',
  'attributes.create.enterValue': 'Enter value',
  'attributes.possibleValues.search': 'Search possible values...',
  'fields.required': 'Required',
  'fields.productCategories': 'Product Categories',
  'fields.height': 'Height',
  'fields.width': 'Width',
  'fields.sku': 'SKU',
  'fields.variants': 'Variants',
  'fields.options': 'Options',
  'promotions.templates.amountOffProducts.title': 'Amount off products',
  'promotions.templates.amountOffProducts.description': 'Discount specific products or collection of products',
  'promotions.templates.amountOffOrder.title': 'Amount off order',
  'promotions.templates.amountOffOrder.description': 'Discounts the total order amount',
  'promotions.templates.percentageOffProduct.title': 'Percentage off product',
  'promotions.templates.percentageOffProduct.description': 'Discounts a percentage off selected products',
  'promotions.templates.percentageOffOrder.title': 'Percentage off order',
  'promotions.templates.percentageOffOrder.description': 'Discounts a percentage of the total order amount',
  'promotions.templates.buyXGetY.title': 'Buy X Get Y',
  'promotions.templates.buyXGetY.description': 'Buy X product(s), get Y product(s)',
  'promotions.templates.freeShipping.title': 'Free shipping',
  'promotions.templates.freeShipping.description': 'Provide free shipping to customers',
  'promotions.campaign.notPartOf': 'Not part of a campaign',
  'promotions.campaign.addToExisting': 'Add this promotion to an existing campaign',
  'promotions.campaign.addToCampaign': 'Add to Campaign',
  'requests.detail.accept': 'Accept',
  'requests.detail.reject': 'Reject',
  'requests.detail.variants': 'Variants',
  'requests.detail.options': 'Options',
  'requests.detail.organization': 'Organization',
  'requests.detail.attributes': 'Attributes',
  'sellers.stockLocations.heading': 'Stock Locations',
  'sellers.stockLocations.assign': 'Assign',
  'sellers.stockLocations.removeTitle': 'Remove stock location',
  'sellers.stockLocations.removeDesc': 'Remove "{{name}}" from this seller? The seller will no longer be able to manage stock at this location.',
  'sellers.stockLocations.removeSuccess': 'Stock location removed',
  'sellers.stockLocations.removeError': 'Failed to remove stock location',
  'sellers.stockLocations.assignSuccess': 'Stock location assigned',
  'sellers.stockLocations.assignError': 'Failed to assign stock location',
  'sellers.customerGroups.deleteDesc': 'You are about to delete the customer group {{name}}. This action cannot be undone.',
  'sellers.customerGroups.deleteSuccess': 'Customer group deleted successfully',
  'sellers.customerGroups.deleteSuccessDesc': '{{name}} deleted successfully',
  'sellers.customerGroups.deleteError': 'Error deleting customer group',
  'sellers.customerGroups.deleteErrorDesc': 'Please try again later',
  'views.viewName': 'View Name',
  'views.enterViewName': 'Enter view name',
  'views.editViewName': 'Edit View Name',
  'views.saveAsNewView': 'Save as New View',
  'views.changeViewName': 'Change the name of your saved view',
  'views.saveConfiguration': 'Save your current configuration as a new view',
  'views.nameRequired': 'Name is required',
  'views.nameNotEmpty': 'Name cannot be empty',
  'views.saveAsSystemDefault': 'Save as system default',
  'views.saveAsSystemDefaultDesc': 'This will save the current configuration as the system default. All users will see this configuration by default unless they have their own personal views. Are you sure?',
  'views.updateExistingView': 'Update existing view',
  'views.updateExistingViewDesc': 'Update "{{name}}" with the current configuration?',
  'views.update': 'Update',
  'views.saveAsDefaultBtn': 'Save as default',
  'views.default': 'Default',
};

for (const [k, v] of Object.entries(adminKeys)) setDeep(admin, k, v);
fs.writeFileSync(adminPath, JSON.stringify(admin, null, 2) + '\n', 'utf8');
console.log('admin en.json updated');

// ===== VENDOR en.json =====
const vendorPath = 'c:/Kayı.com/vendor-panel/src/i18n/translations/en.json';
const vendor = JSON.parse(fs.readFileSync(vendorPath, 'utf8'));

const vendorKeys = {
  'general.loading': 'Loading...',
  'attributes.detail.notFound': 'Attribute not found',
  'attributes.create.enterValue': 'Enter value',
  'fields.required': 'Required',
  'fields.productCategories': 'Product Categories',
  'fields.height': 'Height',
  'fields.width': 'Width',
  'fields.sku': 'SKU',
  'fields.variants': 'Variants',
  'fields.options': 'Options',
  'promotions.templates.percentageOffProduct.title': 'Percentage off product',
  'promotions.templates.percentageOffProduct.description': 'Discounts a percentage off selected products',
  'promotions.templates.percentageOffOrder.title': 'Percentage off order',
  'promotions.templates.percentageOffOrder.description': 'Discounts a percentage of the total order amount',
  'promotions.templates.buyXGetY.title': 'Buy X Get Y',
  'promotions.templates.buyXGetY.description': 'Buy X product(s), get Y product(s)',
  'promotions.campaign.notPartOf': 'Not part of a campaign',
  'promotions.campaign.addToExisting': 'Add this promotion to an existing campaign',
  'promotions.campaign.addToCampaign': 'Add to Campaign',
  'locations.shippingOptions.typeDescription': 'Type description',
  'views.viewName': 'View Name',
  'views.enterViewName': 'Enter view name',
  'views.editViewName': 'Edit View Name',
  'views.saveAsNewView': 'Save as New View',
  'views.changeViewName': 'Change the name of your saved view',
  'views.saveConfiguration': 'Save your current configuration as a new view',
  'views.nameRequired': 'Name is required',
  'views.nameNotEmpty': 'Name cannot be empty',
  'views.saveAsSystemDefault': 'Save as system default',
  'views.saveAsSystemDefaultDesc': 'This will save the current configuration as the system default. All users will see this configuration by default unless they have their own personal views. Are you sure?',
  'views.updateExistingView': 'Update existing view',
  'views.updateExistingViewDesc': 'Update "{{name}}" with the current configuration?',
  'views.update': 'Update',
  'views.saveAsDefaultBtn': 'Save as default',
  'views.default': 'Default',
};

for (const [k, v] of Object.entries(vendorKeys)) setDeep(vendor, k, v);
fs.writeFileSync(vendorPath, JSON.stringify(vendor, null, 2) + '\n', 'utf8');
console.log('vendor en.json updated');

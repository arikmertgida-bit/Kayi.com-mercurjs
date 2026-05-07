/**
 * patch-i18n.js
 * Adds missing sections from en.json to all 27 language files.
 * Existing translations are NEVER overwritten.
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_DIR = path.join(__dirname, 'admin-panel/src/i18n/translations');

// The new/extended sections to inject (English fallback values)
const PATCHES = {
  general: {
    yes: "Yes",
    no: "No"
  },
  dashboard: {
    analyticsTitle: "Analytics",
    analyticsSubtitle: "See your store's progress"
  },
  configuration: {
    domain: "Product Catalog Settings",
    header: "Product Catalog Settings",
    subtitle: "Manage global product catalog configuration settings",
    createRulesTitle: "Create Rules",
    ruleType: "Rule type",
    ruleTypeColumn: "Rule type",
    enabledColumn: "Enabled",
    isRuleEnabled: "Is rule enabled",
    updated: "Updated!",
    error: "Error!",
    tooltip: {
      global_product_catalog: "Indicates whether sellers can only add inventory to admin-managed global products",
      product_request_enabled: "Allow sellers to propose new products for inclusion in the catalog",
      require_product_approval: "Indicates whether seller-added products require admin approval before becoming ready to list",
      product_import_enabled: "Allow sellers to import products via csv file"
    }
  },
  commissionLines: {
    domain: "Commission Lines",
    columns: {
      order: "Order"
    },
    detail: {
      title: "Commission line details",
      sellerName: "Seller name",
      viewSeller: "View Seller",
      orderNumber: "Order number",
      viewOrder: "View Order",
      calculatedValue: "Calculated commission value",
      rateDetails: "Rate details",
      ruleNameValue: "Rule name: {{name}}",
      referenceValue: "Reference: {{ref}}",
      typeValue: "Type: {{type}}",
      rateValuePct: "Rate value: {{value}}%",
      includeTaxValue: "Include tax: {{value}}",
      ruleDeletedAt: "Rule was deleted at {{date}}!"
    }
  },
  requests: {
    domain: "Requests",
    loading: "Loading...",
    columns: {
      date: "Date",
      status: "Status",
      actions: "Actions",
      submittedBy: "Submitted By",
      reason: "Reason",
      orderId: "Order ID",
      customer: "Customer",
      seller: "Seller",
      escalatedDate: "Escalated Date",
      title: "Title",
      name: "Name",
      product: "Product",
      variants: "Variants",
      value: "Value",
      handle: "Handle"
    },
    detail: {
      requestInformation: "Request information",
      submittedOn: "Submitted on {{date}}",
      reviewedOn: "Reviewed on {{date}}",
      reviewerNote: "Reviewer note: {{note}}",
      submittedBy: "Submitted by"
    },
    sellerList: {
      heading: "Seller creation requests",
      detail: {
        title: "Review seller request",
        sellerName: "Seller name",
        member: "Member"
      }
    },
    reviewRemoveList: {
      heading: "Remove review requests",
      detail: {
        title: "Remove review request",
        reviewNote: "Review note",
        reviewRating: "Review rating",
        sellerResponse: "Seller response"
      }
    },
    returnList: {
      heading: "Order return requests",
      detail: {
        title: "Order return request",
        returnReason: "Return request reason",
        vendorResponse: "Vendor response",
        items: "Items",
        escalatedOn: "Escalated on {{date}}"
      }
    },
    productUpdateList: {
      heading: "Product update requests"
    },
    productTypeList: {
      heading: "Product type requests",
      detail: {
        title: "Product type request",
        productTypeValue: "Product type value"
      }
    },
    productTagList: {
      heading: "Product tag requests",
      detail: {
        title: "Product tag request",
        productTagValue: "Product tag value"
      }
    },
    productList: {
      heading: "Product requests",
      variantCount: "{{count}} variant(s)",
      detail: {
        title: "Product request",
        productTitle: "Product title",
        seeFullProduct: "See full product"
      }
    },
    productCollectionList: {
      heading: "Product collection requests",
      detail: {
        title: "Product collection request",
        collectionTitle: "Collection title"
      }
    },
    productCategoryList: {
      heading: "Product category requests",
      detail: {
        title: "Product category request",
        categoryName: "Category name"
      }
    }
  },
  messages: {
    domain: "Messages",
    delete: "Delete for me",
    deleteForEveryone: "Delete for everyone",
    close: "Close",
    connectionLost: "Connection lost. Reconnecting...",
    imageUploadFailed: "Image upload failed"
  },
  messenger: {
    searchConversations: "Search conversations...",
    noConversations: "No conversations yet",
    startConversation: "Start a conversation",
    selectConversation: "Select a conversation",
    startMessaging: "Choose a conversation from the left to start messaging",
    typeMessage: "Type a message...",
    seen: "Seen",
    image: "Image",
    support: "Support",
    direct: "Direct",
    unknown: "Unknown",
    supportTeam: "Support Team"
  },
  reportedImages: {
    domain: "Reported Images",
    subtitle: "Review flagged images and decide to remove or publish them.",
    list: { noRecordsMessage: "No reported images found." },
    status: { all: "All", pending: "Pending", resolved: "Resolved" },
    columns: {
      image: "Image",
      reportedBy: "Reported By",
      reason: "Reason",
      date: "Date",
      status: "Status",
      actions: "Actions"
    },
    actions: { removeImage: "Remove Image", publishImage: "Publish Image" },
    remove: {
      title: "Remove Image",
      description: "This will permanently hide the image from all users. Continue?",
      success: "Image removed successfully."
    },
    publish: {
      title: "Publish Image",
      description: "This will make the image visible to all users again. Continue?",
      success: "Image published successfully."
    },
    errors: { actionFailed: "Something went wrong. Please try again." }
  },
  productReports: {
    domain: "Product Reports",
    subtitle: "Review flagged products and resolve or dismiss reports.",
    list: { noRecordsMessage: "No product reports found." },
    status: { all: "All", pending: "Pending", resolved: "Resolved", dismissed: "Dismissed" },
    columns: {
      product: "Product",
      seller: "Seller",
      reporter: "Reporter",
      reason: "Reason",
      comment: "Comment",
      date: "Date",
      status: "Status",
      actions: "Actions"
    },
    reasons: {
      inaccurate_product_details: "Inaccurate Product Details",
      pricing_irregularities: "Pricing Irregularities",
      prohibited_item: "Prohibited Item",
      counterfeit_trademark: "Counterfeit / Trademark Violation",
      incorrect_categorization: "Incorrect Categorization",
      inappropriate_media: "Inappropriate Media",
      dmca_violation: "DMCA / Copyright Violation",
      other: "Other"
    },
    actions: {
      resolve: "Mark as Attended",
      delete: "Delete",
      notificationSent: "Notification sent to user.",
      reportDeleted: "Report deleted."
    },
    errors: { actionFailed: "An error occurred, please try again." }
  },
  team: {
    domain: "Team",
    subtitle: "Manage your team members and their roles."
  }
};

// Deep merge: patch into target, only adding missing keys (never overwriting)
function deepMergeAddOnly(target, patch) {
  for (const key of Object.keys(patch)) {
    if (!(key in target)) {
      target[key] = patch[key];
    } else if (
      typeof patch[key] === 'object' && patch[key] !== null &&
      typeof target[key] === 'object' && target[key] !== null &&
      !Array.isArray(patch[key])
    ) {
      deepMergeAddOnly(target[key], patch[key]);
    }
    // If key exists with a primitive value, skip (preserve existing translation)
  }
}

const LANGUAGES = [
  'ar','bg','bs','cs','de','el','es','fa','fr','he',
  'hu','id','it','ja','ko','lt','mk','mn','nl','pl',
  'ptBR','ro','ru','th','uk','vi','zhCN'
];

let success = 0;
let failed = 0;

for (const lang of LANGUAGES) {
  const filePath = path.join(TRANSLATIONS_DIR, `${lang}.json`);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    deepMergeAddOnly(data, PATCHES);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    console.log(`✅ ${lang}.json updated`);
    success++;
  } catch (err) {
    console.error(`❌ ${lang}.json FAILED: ${err.message}`);
    failed++;
  }
}

console.log(`\nDone: ${success} updated, ${failed} failed.`);

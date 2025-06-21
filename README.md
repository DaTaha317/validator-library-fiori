# SAPUI5 Constraint-Based Validation Library with i18n Support

## User Manual

**Version:** 1.0  
**Date:** June 2025  
**Library:** SAPUI5/OpenUI5

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Basic Usage](#basic-usage)
4. [Advanced Features](#advanced-features)
5. [Custom Validation Rules](#custom-validation-rules)
6. [Real-time Validation](#real-time-validation)
7. [Message Management](#message-management)
8. [API Reference](#api-reference)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

The SAPUI5 Constraint-Based Validation Library is a comprehensive validation solution that leverages SAPUI5's built-in type system and constraints to provide automatic validation for form controls. It extends the native validation capabilities with custom rules, enhanced error messaging, and centralized message management.

### Key Features

- **Automatic Validation**: Leverages SAPUI5 types and constraints defined in your data binding
- **Custom Rules**: Add field-specific and global validation rules
- **Message Management**: Centralized error message handling with MessageManager integration
- **Real-time Validation**: Validate individual controls or entire forms
- **User-friendly Messages**: Humanized error messages for better user experience
- **Focus Management**: Navigate to invalid fields through message popover

### Supported Control Types

- Input controls (sap.m.Input, sap.m.TextArea)
- Selection controls (sap.m.ComboBox, sap.m.Select)
- Date controls (sap.m.DatePicker, sap.m.TimePicker)
- Any control with value binding and SAPUI5 types

---

## Getting Started

### Installation

1. Copy the validator file to your project's utility folder
2. Include the validator in your controller dependencies

### Basic Setup

```javascript
sap.ui.define(
  ["sap/ui/core/mvc/Controller", "your/project/utils/Validator"],
  function (Controller, Validator) {
    "use strict";

    return Controller.extend("your.project.controller.YourController", {
      onInit: function () {
        // Initialize the validator
        this.oValidator = new Validator(this);

        // You can pass the i18n resource bunddle and use the appropriate i18n files
        // otherwise it autmoatically defaults to builtin English
        this.oValidator = new Validator(this, oResourceBundle);

        // Set the message model for displaying validation messages
        this.setModel(
          this.oValidator.oMessageManager.getMessageModel(),
          "message"
        );
      }
    });
  }
);
```

---

## Basic Usage

### Simple Form Validation

The most common use case is validating all controls in a form before submission:

```javascript
onSavePress: function () {
    var aControls = [
        this.byId("inputName"),
        this.byId("inputEmail"),
        this.byId("comboBoxCountry"),
        this.byId("datePickerBirthDate")
    ];

    var isValid = this.oValidator.validateControls(aControls);

    if (isValid) {
        // Proceed with save operation
        this._saveData();
    } else {
        // Show error messages
        MessageToast.show("Please correct the errors before saving");
    }
}
```

### Single Control Validation

Validate a single control when needed:

```javascript
onInputChange: function (oEvent) {
    var oControl = oEvent.getSource();
    var result = this.oValidator.validateControl(oControl);

    if (!result.isValid) {
        console.log("Validation errors:", result.errors);
    }
}
```

### Required Field Validation

The validator automatically detects required fields based on the control's `required` property:

```xml
<!-- In your XML view -->
<Input
    id="inputName"
    value="{/Name}"
    required="true"
    placeholder="Enter your name" />
```

### Type-based Validation

Validation rules are automatically applied based on the SAPUI5 type defined in your binding:

```xml
<!-- Decimal validation with precision and scale -->
<Input
    id="inputPrice"
    value="{
        path: '/Price',
        type: 'sap.ui.model.type.Float',
        constraints: {
            precision: 10,
            scale: 2,
            minimum: 0
        }
    }" />

<!-- String length validation -->
<Input
    id="inputDescription"
    value="{
        path: '/Description',
        type: 'sap.ui.model.type.String',
        constraints: {
            maxLength: 255,
            minLength: 10
        }
    }" />
```

---

## Advanced Features

### Form Container Validation

Validate all input controls within a specific section using fieldGroupIds:

```xml
<!-- In your XML view, assign fieldGroupIds to controls -->
<FormContainer title="Personal Information">
    <Input
        id="inputFirstName"
        value="{/FirstName}"
        fieldGroupIds="personalInfo"
        required="true" />
    <Input
        id="inputLastName"
        value="{/LastName}"
        fieldGroupIds="personalInfo"
        required="true" />
    <Input
        id="inputEmail"
        value="{/Email}"
        fieldGroupIds="personalInfo"
        required="true" />
</FormContainer>

<FormContainer title="Address Information">
    <Input
        id="inputStreet"
        value="{/Street}"
        fieldGroupIds="addressInfo"
        required="true" />
    <Input
        id="inputCity"
        value="{/City}"
        fieldGroupIds="addressInfo"
        required="true" />
</FormContainer>
```

```javascript
onValidatePersonalInfo: function () {
    var aControls = this._getControlsByFieldGroupId("personalInfo");
    var isValid = this.oValidator.validateControls(aControls);
    return isValid;
},

onValidateAddressInfo: function () {
    var aControls = this._getControlsByFieldGroupId("addressInfo");
    var isValid = this.oValidator.validateControls(aControls);
    return isValid;
},
```

### Combining Fields Validation

Combine multiple sections for comprehensive validation:

```javascript
onValidateEntireForm: function () {
    var aPersonalControls = this._getControlsByFieldGroupId("personalInfo");
    var aAddressControls = this._getControlsByFieldGroupId("addressInfo");
    var aAllControls = aPersonalControls.concat(aAddressControls);

    return this.oValidator.validateControls(aAllControls);
}
```

---

## Custom Validation Rules

### Field-specific Custom Rules

Add custom validation logic for specific fields:

```javascript
onInit: function () {
    this.oValidator = new Validator(this);

    // Validate by control ID
    this.oValidator.addCustomRule("inputEmail", function (value, oControl) {
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return {
            isValid: emailRegex.test(value),
            message: "Please enter a valid email address"
        };
    });

    // Validate by binding path
    this.oValidator.addCustomRule("/CustomerAge", function (value, oControl) {
        var age = parseInt(value);
        return {
            isValid: age >= 18 && age <= 120,
            message: "Age must be between 18 and 120 years"
        };
    });
}
```

### Global Custom Rules

Global custom rules are used for validation logic that is **not tied to any specific SAPUI5 control**. These are typically used for general business rules, cross-system validations, or checking conditions like file uploads, external data availability, or complex business logic that spans multiple entities.

Add validation rules that span multiple fields or general business requirements:

```javascript
onInit: function () {
    this.oValidator = new Validator(this);
    this.setModel(this.oValidator.oMessageManager.getMessageModel(), "message");

    // Business rule validation - not tied to specific control
    this.oValidator.addGlobalCustomRule(function () {
        var totalAmount = parseFloat(this.byId("inputTotal").getValue() || 0);
        var customerCredit = parseFloat(this.getView().getModel().getProperty("/CustomerCreditLimit") || 0);

        if (totalAmount > customerCredit) {
            return {
                isValid: false,
                message: "Order amount exceeds customer credit limit of " + customerCredit
            };
        }

        return { isValid: true };
    }.bind(this));

    // File upload validation - general business requirement
    this.oValidator.addGlobalCustomRule(function () {
        var bRequiresAttachment = this.getView().getModel().getProperty("/RequiresAttachment");
        var aAttachments = this.getView().getModel().getProperty("/attachments");

        if (bRequiresAttachment) {
            return {
                isValid: aAttachments.length > 0,
                message: "A document attachment is required for this transaction type"
            };
        }

        return { isValid: true };
    }.bind(this));

    // Cross-field date validation - business logic rule
    this.oValidator.addGlobalCustomRule(function () {
        var startDate = this.byId("datePickerStart").getDateValue();
        var endDate = this.byId("datePickerEnd").getDateValue();

        if (startDate && endDate && startDate >= endDate) {
            return {
                isValid: false,
                message: "End date must be after start date"
            };
        }

        return { isValid: true };
    }.bind(this));

    // External system availability check - general business rule
    this.oValidator.addGlobalCustomRule(function () {
        var bSystemAvailable = this.getView().getModel("system").getProperty("/ExternalSystemAvailable");
        var bRequiresExternalValidation = this.getView().getModel().getProperty("/RequiresExternalValidation");

        if (bRequiresExternalValidation && !bSystemAvailable) {
            return {
                isValid: false,
                message: "External validation system is currently unavailable. Please try again later."
            };
        }

        return { isValid: true };
    }.bind(this));
}
```

### Validating Global Custom Rules Separately

You can validate only the global custom rules without validating individual controls:

```javascript
onValidateBusinessRules: function () {
    var result = this.oValidator.validateGlobalCustomRules();

    if (!result.isValid) {
        console.log("Business rule validation failed:", result.errors);
        MessageToast.show("Please check business rule requirements");
        return false;
    }

    return true;
}
```

### Chaining Custom Rules

You can chain multiple custom rules for the same field:

```javascript
// Password validation example
this.oValidator
  .addCustomRule("inputPassword", function (value) {
    return {
      isValid: value.length >= 8,
      message: "Password must be at least 8 characters long"
    };
  })
  .addCustomRule("inputPassword", function (value) {
    var hasUpperCase = /[A-Z]/.test(value);
    var hasLowerCase = /[a-z]/.test(value);
    var hasNumbers = /\d/.test(value);

    return {
      isValid: hasUpperCase && hasLowerCase && hasNumbers,
      message: "Password must contain uppercase, lowercase, and numbers"
    };
  });
```

---

## Real-time Validation

### Page-wide Real-time Validation

For immediate user feedback across your entire page, you can implement real-time validation using the `liveChange` event. Create a generic validation method and attach it to all your input controls:

```javascript
// Generic real-time validation method
onRealTimeValidation: function(oEvent) {
    this.oValidator.validateControl(oEvent.getSource());
},
```

Then in your XML view, attach this method to all input controls that don't have their own change logic:

```xml
<!-- Apply to all input controls for immediate validation feedback -->
<Input
    id="inputName"
    value="{/Name}"
    required="true"
    liveChange="onRealTimeValidation"
    placeholder="Enter your name" />

<Input
    id="inputEmail"
    value="{/Email}"
    required="true"
    liveChange="onRealTimeValidation"
    placeholder="Enter your email" />

<Input
    id="inputPhone"
    value="{/Phone}"
    liveChange="onRealTimeValidation"
    placeholder="Enter your phone number" />
```

### Combining Real-time Validation with Existing Logic

If an input control already has a `change` or `liveChange` event handler that performs other logic, simply add the validation call at the beginning of your existing method:

```javascript
// Existing method with additional logic
onEmailChange: function(oEvent) {
    // Add validation as the first step
    this.oValidator.validateControl(oEvent.getSource());

    // Continue with your existing logic
    var sEmail = oEvent.getParameter("value");
    this._checkEmailAvailability(sEmail);
    this._updateEmailPreview(sEmail);
},

onQuantityChange: function(oEvent) {
    // Add validation first
    this.oValidator.validateControl(oEvent.getSource());

    // Existing business logic
    var iQuantity = parseInt(oEvent.getParameter("value"));
    this._calculateTotalPrice(iQuantity);
    this._checkInventoryAvailability(iQuantity);
}
```

---

## Message Management

### Displaying Error Messages

The Library integrates with SAPUI5's MessageManager for centralized error handling:

```javascript
// Messages are automatically added to MessageManager
// You can display them using MessagePopover

onShowMessages: function (oEvent) {
    var oButton = oEvent.getSource();
    this.oValidator.showMessagePopover(oButton);
}
```

### Server Error Integration

Add server-side validation errors from OData service responses to the message system:

```javascript
// Handle OData service errors & communication during save operations
onSubmitRequest: function(requestData) {
        this.DefaultModel.create("/RequestDataSet", requestData, {
            success: function(oRequestData, response) {
                if (oRequestData.ReturnMsgType !== 'E') {
                    that.submitRequestSuccess();
                } else {
                    this.oValidator.addServerErrorMessage(oRequestData.ReturnMsgTxt);
                    setTimeout(function() {
                        this.onMessagesButtonPress();
                    }.bind(this), 100);
                }
            }.bind(this),
            error: function(oError) {
                console.log(oError);
                sap.m.MessageToast.show("Error submitting request");
            }
        });
    },
```

### Custom Message Handling

Access the MessageManager directly for advanced scenarios:

```javascript
onCustomMessageHandling: function () {
    var oMessageManager = this.oValidator.oMessageManager;
    var aMessages = oMessageManager.getMessageModel().getData();

    // Filter only error messages
    var aErrorMessages = aMessages.filter(function (msg) {
        return msg.type === "Error";
    });

    console.log("Current error count:", aErrorMessages.length);
}
```

---

## API Reference

### Constructor

**`new Validator(oController, oResourceBundle)`**

Creates a new validator instance.

- `oController` (sap.ui.core.mvc.Controller): The controller instance
- `oResourceBundle` Optional i18n resource bundle to support other languages

### Core Methods

**`validateControls(aControls)`**

Validates an array of controls.

- `aControls` (Array): Array of SAPUI5 controls to validate
- Returns: `boolean` - true if all controls are valid

**`validateControl(oControl)`**

Validates a single control.

- `oControl` (sap.ui.core.Control): The control to validate
- Returns: `Object` - `{isValid: boolean, errors: Array}`

**`validateGlobalCustomRules()`**

Validates all global custom rules without validating individual controls. Clears existing global validation messages before validating.

- Returns: `Object` - `{isValid: boolean, errors: Array}`

### Customization Methods

**`addCustomRule(controlIdOrPath, validationFunction)`**

Adds a custom validation rule for a specific field.

- `controlIdOrPath` (string): Control ID or binding path
- `validationFunction` (function): Validation function returning `{isValid: boolean, message?: string}`
- Returns: `Validator` - for method chaining

**`addGlobalCustomRule(validationFunction)`**

Adds a global validation rule.

- `validationFunction` (function): Validation function returning `{isValid: boolean, message?: string}`
- Returns: `Validator` - for method chaining

### Message Methods

**`showMessagePopover(oButton)`**

Displays the message popover.

- `oButton` (sap.ui.core.Control): The button to anchor the popover to

**`addServerErrorMessage(errorMessage, additionalText)`**

Adds a server error message.

- `errorMessage` (string): The error message text
- `additionalText` (string): Additional context information
- Returns: `Validator` - for method chaining

### Properties

**`oMessageManager`**

Reference to the SAPUI5 MessageManager instance.

**`InputsErrorsIds`**

Array containing error information for focusing on invalid controls.

---

## Best Practices

### 1. Initialize Early

Initialize the validator in the `onInit` method of your controller:

```javascript
onInit: function () {
    this.oValidator = new Validator(this);
    this._setupCustomValidation();
}
```

### 2. Group Related Validations

Organize your validation setup in dedicated methods:

```javascript
_setupCustomValidation: function () {
    this._setupBasicFieldValidation();
    this._setupBusinessRuleValidation();
    this._setupCrossFieldValidation();
},

_setupBasicFieldValidation: function () {
    // Email, phone, etc.
},

_setupBusinessRuleValidation: function () {
    // Business-specific rules
},

_setupCrossFieldValidation: function () {
    // Multi-field validation
}
```

### 3. Use Meaningful Error Messages

Provide clear, actionable error messages:

```javascript
// Good
"Email address format is invalid. Example: user@example.com";

// Better than
"Invalid input";
```

### 4. Choose Appropriate Validation Timing

Implement validation at the right moments based on user experience needs:

```javascript
// For form submission - comprehensive validation
onSavePress: function () {
    if (this.oValidator.validateControls(this._getAllFormControls())) {
        this._performSave();
    }
},

// For real-time feedback - immediate validation
onRealTimeValidation: function(oEvent) {
    this.oValidator.validateControl(oEvent.getSource());
},
```

### 5. Handle Async Validation

For server-side validation or async operations:

```javascript
onAsyncValidation: function () {
    var that = this;

    // First, do client-side validation
    if (!this.oValidator.validateControls(this._getAllFormControls())) {
        return Promise.reject("Client validation failed");
    }

    // Then, do server-side validation
    return this._callServerValidation()
        .then(function (result) {
            if (!result.isValid) {
                that.oValidator.addServerErrorMessage(result.message);
                return Promise.reject("Server validation failed");
            }
            return result;
        });
}
```

### 6. Performance Considerations

For large forms, consider validating sections separately:

```javascript
onValidateSection: function (sSectionId) {
    var oSection = this.byId(sSectionId);
    var aSectionControls = this._getControlsInContainer(oSection);

    return this.oValidator.validateControls(aSectionControls);
}
```

---

## Troubleshooting

### Common Issues

**1. Validation Not Triggered**

_Problem_: Controls are not being validated.

_Solution_: Ensure controls have proper data binding with types and constraints defined.

```javascript
// Check if control has binding
var oBinding = oControl.getBinding("value");
if (!oBinding) {
  console.warn("Control has no value binding:", oControl.getId());
}
```

**2. Custom Rules Not Working**

_Problem_: Custom validation rules are not being executed.

_Solution_: Verify the control ID or binding path used in `addCustomRule`.

```javascript
// Debug control ID
console.log("Control ID:", this.byId("myInput").getId());
console.log("Local ID:", this.byId("myInput").getId().split("--").pop());

// Debug binding path
var oBinding = this.byId("myInput").getBinding("value");
console.log("Binding path:", oBinding ? oBinding.getPath() : "No binding");
```

**3. Messages Not Displaying**

_Problem_: Error messages are not visible to users.

_Solution_: Ensure MessageManager is properly configured and MessagePopover is implemented.

```javascript
// Check MessageManager
var oMsgManager = sap.ui.getCore().getMessageManager();
console.log("Messages:", oMsgManager.getMessageModel().getData());
```

**4. Required Field Detection Issues**

_Problem_: Required validation not working for some controls.

_Solution_: Check if the `required` property is properly set.

```javascript
// Debug required property
var oControl = this.byId("myInput");
console.log("Required property:", oControl.getRequired());
console.log("Required binding:", oControl.getBinding("required"));
```

**5. addCustomRule or addGlobalCustomRule Scope Issues**

_Problem_: Custom validation rules fail when trying to access controller properties or models.

_Solution_: When your custom validation function needs to access controller properties, models, or other methods using `this`, you must bind the function to the controller scope using `.bind(this)`.

```javascript
// ❌ Wrong - 'this' will not refer to the controller
this.oValidator.addCustomRule("inputEmail", function (value, oControl) {
  var model = this.getView().getModel(); // This will fail!
  // ...
});

// ✅ Correct - Bind the function to controller scope
this.oValidator.addCustomRule(
  "inputEmail",
  function (value, oControl) {
    var model = this.getView().getModel(); // This works!
    var customerData = model.getProperty("/CustomerData");
    // ...
  }.bind(this)
);

// ✅ Correct - Global custom rule with proper binding
this.oValidator.addGlobalCustomRule(
  function () {
    var totalAmount = parseFloat(this.byId("inputTotal").getValue() || 0);
    var customerCredit = this.getView()
      .getModel()
      .getProperty("/CustomerCreditLimit");
    // ...
  }.bind(this)
);
```

### Performance Monitoring

Monitor validation performance for large forms:

```javascript
onValidateWithTiming: function () {
    var startTime = Date.now();
    var isValid = this.oValidator.validateControls(this._getAllControls());
    var endTime = Date.now();

    console.log("Validation took:", endTime - startTime, "ms");
    return isValid;
}
```

---

## Appendix

### Supported SAPUI5 Types

The validator supports these SAPUI5 types for constraint validations:

- `sap.ui.model.type.String`  
  **Supported Constraints:**

  - `maxLength`
  - `minLength`

- `sap.ui.model.type.Integer`  
  **Supported Constraints:**

  - `minimum`
  - `maximum`

- `sap.ui.model.type.Float`  
  **Supported Constraints:**
  - `minimum`
  - `maximum`
  - `precision`
  - `scale`

### Browser Compatibility

The Library is compatible with all browsers supported by SAPUI5/OpenUI5.

### Version History

- **1.0** - Initial release with core validation features
- Support for SAPUI5 types and constraints
- Custom validation rules
- Message management integration

---

_This manual covers the core functionality of the SAPUI5 Constraint-Based Validation Library. For specific implementation questions or advanced use cases, refer to your development team or the Library maintainer._

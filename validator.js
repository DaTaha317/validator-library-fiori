/**
 * SAPUI5 Constraint-Based Validation Library with i18n Support
 * Uses existing SAPUI5 constraints and types for validation
 */

sap.ui.define(
  [
    "sap/ui/core/message/Message",
    "sap/ui/core/message/MessageType",
    "sap/ui/core/Element",
    "sap/m/MessagePopover",
    "sap/m/MessagePopoverItem",
    "sap/ui/core/message/ControlMessageProcessor"
  ],
  function (
    Message,
    MessageType,
    Element,
    MessagePopover,
    MessagePopoverItem,
    ControlMessageProcessor
  ) {
    "use strict";

    // =============================================================================
    // GENERAL - CONSTRUCTOR AND MAIN VALIDATION METHODS
    // =============================================================================
    // This section contains the main validator class constructor and the primary
    // validation methods that orchestrate the overall validation process.

    /**
     * Main Validator class that leverages SAPUI5 constraints
     * @param {object} oController - The controller instance
     * @param {object} oResourceBundle - The resource bundle for i18n
     */
    var Validator = function (oController, oResourceBundle) {
      this.oController = oController;
      this.oResourceBundle = oResourceBundle;
      this.oMessageManager = oController.getView().getModel("message")
        ? oController.getView().getModel("message")
        : sap.ui.getCore().getMessageManager();
      this.oMessageProcessor = new ControlMessageProcessor();
      this.oMessageManager.registerMessageProcessor(this.oMessageProcessor);
      this.InputsErrorsIds = [];
      this._messagePopover = null;
      this.customRules = {}; // For additional custom validation rules
      this.globalCustomRules = []; // For global custom validation rules that are not tied to a specific control
    };

    /**
     * Main validation method that validates an array of controls
     * @param {array} aControls - Array of SAPUI5 controls to validate
     * @returns {boolean} - True if all controls are valid, false otherwise
     */
    Validator.prototype.validateControls = function (aControls) {
      var aFilteredControls = this._filterValidatableControls(aControls);
      this.oMessageManager.removeAllMessages();
      this.InputsErrorsIds = [];
      var isValid = true;

      // Handle controls validations
      aFilteredControls.forEach(
        function (oControl) {
          try {
            var fieldResult = this._validateControl(oControl);
            if (!fieldResult.isValid) {
              isValid = false;
            }
          } catch (e) {
            console.error("Validation Error: ", e);
            isValid = false;
          }
        }.bind(this)
      );

      // Handle global custom validations
      if (this.globalCustomRules) {
        var globalValidationResult = this._validateGlobalCustomRules();
        if (!globalValidationResult.isValid) {
          isValid = false;
        }
      }

      return isValid;
    };

    /**
     * Filter controls to only include common validatable ones
     * @param {array} aControls - Array of controls from getControlsByFieldGroupId
     * @returns {array} - Filtered array of validatable controls
     */
    Validator.prototype._filterValidatableControls = function (aControls) {
      // Common validatable control types
      var aValidatableTypes = [
        "sap.m.Input",
        "sap.m.TextArea",
        "sap.m.Select",
        "sap.m.ComboBox",
        "sap.m.MultiComboBox",
        "sap.m.CheckBox",
        "sap.m.DatePicker",
        "sap.m.DateTimePicker",
        "sap.m.TimePicker",
        "sap.m.MultiInput",
        "sap.m.CheckBox",
        "sap.m.Switch"
      ];

      return aControls.filter(function (oControl) {
        if (!oControl || !oControl.getMetadata) {
          return false;
        }

        var sControlType = oControl.getMetadata().getName();

        // Check if it's a validatable type
        if (aValidatableTypes.indexOf(sControlType) === -1) {
          return false;
        }

        // Skip invisible or disabled controls
        if (
          (oControl.getVisible && !oControl.getVisible()) ||
          (oControl.getEnabled && !oControl.getEnabled())
        ) {
          return false;
        }

        return true;
      });
    };

    /**
     * Validates a single control with all validation rules
     * @param {object} oControl - SAPUI5 control to validate
     * @returns {object} - Validation result with isValid flag and errors array
     */
    Validator.prototype._validateControl = function (oControl) {
      var isValid = true;
      var errors = [];
      var sTarget = this._getBindingPath(oControl);
      var controlLabel = this._getControlLabel(oControl);
      var value = this._getControlValue(oControl);

      // 1. Required field validation
      var requiredResult = this._validateRequired(oControl, value);
      if (!requiredResult.isValid) {
        isValid = false;
        errors.push(requiredResult.message);
      }

      // 2. Type and constraint validation (only if not empty and passes required check)
      if (value && requiredResult.isValid) {
        var constraintResult = this._validateConstraints(oControl, value);
        if (!constraintResult.isValid) {
          isValid = false;
          errors = errors.concat(constraintResult.errors);
        }
      }

      // 3. Custom validation rules (only if not empty and passes required check)
      if (value || requiredResult.isValid) {
        var customResult = this._validateCustomRules(oControl, value);
        if (!customResult.isValid) {
          isValid = false;
          errors = errors.concat(customResult.errors);
        }
      }

      // Set control state
      this._setControlState(oControl, isValid, errors);

      // Add to message manager
      if (!isValid) {
        this._addErrorMessages(oControl, sTarget, controlLabel, errors);
      }

      return {
        isValid: isValid,
        errors: errors
      };
    };

    /**
     * Validate specific control in real-time
     * @param {object} oControl - SAPUI5 control to validate
     * @returns {object} - Validation result
     */
    Validator.prototype.validateControl = function (oControl) {
      // Clear existing messages for this specific control
      this._clearControlMessages(oControl);

      // Delegate to the main validation logic
      return this._validateControl(oControl);
    };

    /**
     * Clear messages associated with a specific control from the message manager
     * @param {object} oControl - SAPUI5 control
     * @private
     */
    Validator.prototype._clearControlMessages = function (oControl) {
      var sTarget = this._getBindingPath(oControl);
      var controlId = oControl.getId(); // Use full ID instead of sId for consistency

      if (sTarget) {
        // Get all messages from message manager
        var aMessages = this.oMessageManager.getMessageModel().getData();

        // Find messages that match this control's target
        var aMessagesToRemove = aMessages.filter(function (oMessage) {
          return oMessage.target === sTarget;
        });

        // Remove the matching messages
        if (aMessagesToRemove.length > 0) {
          this.oMessageManager.removeMessages(aMessagesToRemove);
        }
      }

      // Also remove from InputsErrorsIds array
      this.InputsErrorsIds = this.InputsErrorsIds.filter(function (item) {
        return item.inputError !== controlId;
      });

      // Clear the control's visual state
      if (oControl.setValueState) {
        oControl.setValueState("None");
        oControl.setValueStateText("");
      }
    };

    /**
     * Clear all validation messages and reset the state of all affected controls
     * This method removes all messages from the message manager and resets the visual state
     * of all controls that were previously marked with errors.
     * @returns {object} - This validator instance for chaining
     */
    Validator.prototype.clearAllMessages = function () {
      // First, reset the state of all controls that have errors
      if (this.InputsErrorsIds && this.InputsErrorsIds.length > 0) {
        this.InputsErrorsIds.forEach(
          function (item) {
            try {
              // Get the control using the Element registry
              var oControl = sap.ui.core.Element.registry.get(item.inputError);
              
              if (oControl && oControl.setValueState) {
                // Reset the control's visual state
                oControl.setValueState("None");
                oControl.setValueStateText("");
              }
            } catch (e) {
              // Control might not exist anymore (e.g., destroyed), log and continue
              console.warn(
                "Could not reset control state for: " + item.inputError,
                e
              );
            }
          }.bind(this)
        );
      }
    
      // Clear all messages from the message manager
      this.oMessageManager.removeAllMessages();
    
      // Reset the InputsErrorsIds array
      this.InputsErrorsIds = [];
    
      // Return this for method chaining
      return this;
    };


    // =============================================================================
    // HELPER FUNCTIONS - UTILITY METHODS
    // =============================================================================
    // This section contains utility methods for getting control properties,
    // handling i18n, checking values, and other common operations.

    /**
     * Get translated text with parameters
     * @param {string} sKey - The i18n key
     * @param {array} aParams - Parameters for text replacement
     * @returns {string} - Translated text
     * @private
     */
    Validator.prototype._getText = function (sKey, aParams) {
      if (this.oResourceBundle) {
        return this.oResourceBundle.getText(sKey, aParams);
      }
      // Fallback texts if no resource bundle is available
      return this._getFallbackText(sKey, aParams);
    };

    /**
     * Fallback texts when i18n is not available
     * @param {string} sKey - The fallback key
     * @param {array} aParams - Parameters for text replacement
     * @returns {string} - Fallback text
     * @private
     */
    Validator.prototype._getFallbackText = function (sKey, aParams) {
      var fallbackTexts = {
        "validator.required": "{0} is required",
        "validator.minLength": "{0}: Minimum length is {1} characters",
        "validator.maxLength": "{0}: Maximum length is {1} characters",
        "validator.minValue": "{0}: Minimum value is {1}",
        "validator.maxValue": "{0}: Maximum value is {1}",
        "validator.maxDigits": "{0}: Maximum total digits is {1}",
        "validator.maxDecimalPlaces": "{0}: Maximum decimal places is {1}",
        "validator.invalidValue": "Invalid value",
        "validator.invalidDecimal":
          "Enter a valid decimal number (max {0} digits, {1} decimal places)",
        "validator.invalidDecimalSimple": "Enter a valid decimal number",
        "validator.invalidInteger": "Enter a valid integer",
        "validator.invalidTime": "Enter a valid time",
        "validator.invalidDate": "Enter a valid date",
        "validator.invalidText": "Enter a valid text",
        "validator.maxLengthSimple": "Maximum length is {0} characters",
        "validator.fieldLabel": "Field",
        "validator.validationError": "Validation error occurred"
      };

      var text = fallbackTexts[sKey] || sKey;

      // Simple parameter replacement
      if (aParams && aParams.length > 0) {
        aParams.forEach(function (param, index) {
          text = text.replace("{" + index + "}", param);
        });
      }

      return text;
    };

    /**
     * Get the current value from a control
     * @param {object} oControl - SAPUI5 control
     * @returns {any} - The control's current value
     * @private
     */
    Validator.prototype._getControlValue = function (oControl) {
      // Special handling for MultiInput - check tokens instead of input value
      var controlType = oControl.getMetadata().getName();
      if (controlType === "sap.m.MultiInput") {
        return oControl.getTokens();
      }
      if (oControl.getValue) {
        return oControl.getValue();
      } else if (oControl.getSelectedKey) {
        return oControl.getSelectedKey();
      } else if (oControl.getSelected) {
        return oControl.getSelected();
      } else if (oControl.getDateValue) {
        return oControl.getDateValue();
      }
      return "";
    };

    /**
     * Get the value binding for a control
     * @param {object} oControl - SAPUI5 control
     * @returns {object} - The binding object
     * @private
     */
    Validator.prototype._getValueBinding = function (oControl) {
      if (oControl.getBinding("value")) {
        return oControl.getBinding("value");
      } else if (oControl.getBinding("selectedKey")) {
        return oControl.getBinding("selectedKey");
      } else if (oControl.getBinding("dateValue")) {
        return oControl.getBinding("dateValue");
      }
      return null;
    };

    /**
     * Get the binding path for a control
     * @param {object} oControl - SAPUI5 control
     * @returns {string} - The binding path
     * @private
     */
    Validator.prototype._getBindingPath = function (oControl) {
      var binding = this._getValueBinding(oControl);
      var bindingPath = binding ? binding.getPath() : "";

      // For controls without bindings (like unbound MultiInput), use control ID as unique identifier
      if (!bindingPath) {
        bindingPath = "/" + oControl.getId();
      }

      return bindingPath;
    };
    /**
     * Get the label text for a control
     * @param {object} oControl - SAPUI5 control
     * @returns {string} - The control's label text
     * @private
     */
    Validator.prototype._getControlLabel = function (oControl) {
      if (oControl.getLabels && oControl.getLabels().length !== 0) {
        return oControl.getLabels()[0].getText();
      } else if (oControl.getPlaceholder) {
        return oControl.getPlaceholder();
      }
      return this._getText("validator.fieldLabel");
    };

    /**
     * Get the local ID of a control (without view prefix)
     * @param {object} oControl - SAPUI5 control
     * @returns {string} - The control's local ID
     * @private
     */
    Validator.prototype._getControlId = function (oControl) {
      var controlId = oControl.sId;
      // Return local ID (remove view prefix)
      return controlId.split("--").pop();
    };

    /**
     * Check if a control is marked as required
     * @param {object} oControl - SAPUI5 control
     * @returns {boolean} - True if required, false otherwise
     * @private
     */
    Validator.prototype._isControlRequired = function (oControl) {
      if (oControl.getRequired) {
        // Handle both static and binding-based required properties
        var required = oControl.getRequired();
        if (typeof required === "boolean") {
          return required;
        }
        // If it's a binding, try to get the current value
        if (oControl.getBinding("required")) {
          return oControl.getBinding("required").getValue();
        }
      }
      return false;
    };

    /**
     * Check if a value is considered empty
     * @param {any} value - The value to check
     * @param {object} oControl - SAPUI5 control (for context)
     * @returns {boolean} - True if empty, false otherwise
     * @private
     */
    Validator.prototype._isEmpty = function (value, oControl) {
      // Special handling for MultiInput - check if tokens array is empty
      var controlType = oControl.getMetadata().getName();
      if (controlType === "sap.m.MultiInput") {
        return !value || !Array.isArray(value) || value.length === 0;
      }
      if (value === null || value === undefined) {
        return true;
      }

      if (typeof value === "string" && value.trim() === "") {
        return true;
      }

      // Special cases for different control types
      if (
        oControl.getMetadata().getName() === "sap.m.ComboBox" ||
        oControl.getMetadata().getName() === "sap.m.Select"
      ) {
        return value === "" || value === "00" || value === "0";
      }

      if (typeof value === "number") {
        return false; // Numbers are never "empty" for our purposes
      }

      return false;
    };

    /**
     * Set a custom resource bundle
     * @param {object} oResourceBundle - The resource bundle
     * @returns {object} - This validator instance for chaining
     */
    Validator.prototype.setResourceBundle = function (oResourceBundle) {
      this.oResourceBundle = oResourceBundle;
      return this;
    };

    // =============================================================================
    // MESSAGE MANAGER AND POPUP - ERROR HANDLING AND DISPLAY
    // =============================================================================
    // This section handles error message management, control state updates,
    // and the message popover functionality for displaying validation errors.

    /**
     * Set the visual state of a control based on validation result
     * @param {object} oControl - SAPUI5 control
     * @param {boolean} isValid - Whether the control is valid
     * @param {array} errors - Array of error messages
     * @private
     */
    Validator.prototype._setControlState = function (
      oControl,
      isValid,
      errors
    ) {
      if (oControl.setValueState) {
        if (isValid) {
          oControl.setValueState("None");
          oControl.setValueStateText("");
        } else {
          oControl.setValueState("Error");
          // Format as bullet points
          var errorText =
            errors.length > 1 ? "• " + errors.join("\n• ") : errors[0];
          oControl.setValueStateText(errorText);
        }
      }
    };

    /**
     * Add error messages to the message manager
     * @param {object} oControl - SAPUI5 control
     * @param {string} sTarget - Binding target path
     * @param {string} controlLabel - Control label for display
     * @param {array} errors - Array of error messages
     * @private
     */
    Validator.prototype._addErrorMessages = function (
      oControl,
      sTarget,
      controlLabel,
      errors
    ) {
      var errorIdEntry = {
        sTarget: sTarget,
        inputError: oControl.getId() // Use full ID instead of sId
      };
      this.InputsErrorsIds.push(errorIdEntry);

      errors.forEach(
        function (errorMessage) {
          this.oMessageManager.addMessages(
            new Message({
              message: errorMessage,
              type: MessageType.Error,
              target: sTarget,
              additionalText: controlLabel,
              processor: this.oMessageProcessor
            })
          );
        }.bind(this)
      );
    };

    /**
     * Add server error message to message manager
     * @param {string} errorMessage - The error message
     * @param {string} additionalText - Additional text for the error
     * @returns {object} - This validator instance for chaining
     */
    Validator.prototype.addServerErrorMessage = function (
      errorMessage,
      additionalText
    ) {
      if (!errorMessage) {
        return this;
      }

      this.oMessageManager.addMessages(
        new Message({
          message: errorMessage,
          type: MessageType.Error,
          target: "/serverError",
          additionalText: additionalText || "",
          processor: this.oMessageProcessor
        })
      );

      return this;
    };

    /**
     * Show the message popover with validation errors
     * @param {object} oButton - Button to anchor the popover to
     */
    Validator.prototype.showMessagePopover = function (oButton) {
      if (!this._messagePopover) {
        this._messagePopover = this._createMessagePopover();
        oButton.addDependent(this._messagePopover);
      }
      this._messagePopover.toggle(oButton);
    };

    /**
     * Create the message popover control
     * @returns {object} - MessagePopover instance
     * @private
     */
    Validator.prototype._createMessagePopover = function () {
      var that = this;
      return new MessagePopover({
        activeTitlePress: function (oEvent) {
          var oItem = oEvent.getParameter("item");
          var oMessage = oItem.getBindingContext("message").getObject();
          var oControl = "";

          that.InputsErrorsIds.forEach(function (item) {
            if (item.sTarget === oMessage.target) {
              oControl = Element.registry.get(item.inputError);
            }
          });

          if (oControl) {
            oControl.focus();
          }
        },
        items: {
          path: "message>/",
          template: new MessagePopoverItem({
            description: "{message>message}",
            type: "{message>type}",
            title: "{message>message}",
            subtitle: "{message>additionalText}",
            activeTitle: true
          })
        },
        groupItems: true
      });
    };

    // =============================================================================
    // CUSTOM RULES - CUSTOM VALIDATION LOGIC
    // =============================================================================
    // This section handles custom validation rules that can be added by developers
    // for specific business logic that goes beyond standard SAPUI5 constraints.

    /**
     * Validate custom rules for a specific control
     * @param {object} oControl - SAPUI5 control
     * @param {any} value - The control's value
     * @returns {object} - Validation result with isValid flag and errors array
     * @private
     */
    Validator.prototype._validateCustomRules = function (oControl, value) {
      var controlId = this._getControlId(oControl);
      var bindingPath = this._getBindingPath(oControl);
      var errors = [];
      var isValid = true;

      // Check custom rules by control ID
      if (
        this.customRules[controlId] &&
        Array.isArray(this.customRules[controlId])
      ) {
        for (var i = 0; i < this.customRules[controlId].length; i++) {
          try {
            var result = this.customRules[controlId][i](value, oControl);
            if (!result.isValid) {
              isValid = false;
              errors.push(result.message);
              // Continue to check all rules even if one fails
            }
          } catch (e) {
            console.error(
              "Custom validation error for control ID " + controlId + ":",
              e
            );
            isValid = false;
            errors.push(this._getText("validator.validationError"));
          }
        }
      }

      // Check custom rules by binding path
      if (
        this.customRules[bindingPath] &&
        Array.isArray(this.customRules[bindingPath])
      ) {
        for (var i = 0; i < this.customRules[bindingPath].length; i++) {
          try {
            var result = this.customRules[bindingPath][i](value, oControl);
            if (!result.isValid) {
              isValid = false;
              errors.push(result.message);
              // Continue to check all rules even if one fails
            }
          } catch (e) {
            console.error(
              "Custom validation error for binding path " + bindingPath + ":",
              e
            );
            isValid = false;
            errors.push(this._getText("validator.validationError"));
          }
        }
      }

      return {
        isValid: isValid,
        errors: errors
      };
    };

    /**
     * Validate global custom rules that are not tied to specific controls
     * @returns {object} - Validation result with isValid flag and errors array
     * @private
     */
    Validator.prototype._validateGlobalCustomRules = function () {
      var isValid = true;
      var errors = [];
      this.globalCustomRules.forEach(
        function (validationFunction) {
          try {
            var result = validationFunction();
            if (!result.isValid) {
              isValid = false;
              errors.push(result.message);

              // Add to message manager
              this.oMessageManager.addMessages(
                new Message({
                  message: result.message,
                  type: MessageType.Error,
                  target: "/globalValidation",
                  additionalText: "",
                  processor: this.oMessageProcessor
                })
              );
            }
          } catch (e) {
            console.error("Global validation error: ", e);
            isValid = false;
          }
        }.bind(this)
      );

      return {
        isValid: isValid,
        errors: errors
      };
    };

    /**
     * Validate global custom rules (exposed public method)
     * Clears existing global validation messages before validating
     * @returns {object} - Validation result with isValid flag and errors array
     */
    Validator.prototype.validateGlobalCustomRules = function () {
      // Clear existing global validation messages first
      var aMessages = this.oMessageManager.getMessageModel().getData();
      var aGlobalMessagesToRemove = aMessages.filter(function (oMessage) {
        return oMessage.target === "/globalValidation";
      });

      if (aGlobalMessagesToRemove.length > 0) {
        this.oMessageManager.removeMessages(aGlobalMessagesToRemove);
      }

      // Call the private method to perform validation
      return this._validateGlobalCustomRules();
    };

    /**
     * Add custom validation rules for a specific control or binding path
     * @param {string} controlIdOrPath - Control ID or binding path
     * @param {function} validationFunction - Function that returns {isValid: boolean, message?: string}
     * @returns {object} - This validator instance for chaining
     */
    Validator.prototype.addCustomRule = function (
      controlIdOrPath,
      validationFunction
    ) {
      /*
       * validationFunction should return {isValid: true/false, message?: "error message"}
       */

      if (typeof validationFunction !== "function") {
        throw new Error(
          "validationFunction is required and must be a function"
        );
      }

      // Initialize as array if it doesn't exist
      if (!this.customRules[controlIdOrPath]) {
        this.customRules[controlIdOrPath] = [];
      }

      // If it exists but is not an array (backward compatibility), convert to array
      if (!Array.isArray(this.customRules[controlIdOrPath])) {
        this.customRules[controlIdOrPath] = [this.customRules[controlIdOrPath]];
      }

      // Add the new validation function to the array
      this.customRules[controlIdOrPath].push(validationFunction);

      return this; // Enable chaining
    };

    /**
     * Add global custom validation rules that apply to the entire form
     * @param {function} validationFunction - Function that returns {isValid: boolean, message?: string}
     * @returns {object} - This validator instance for chaining
     */
    Validator.prototype.addGlobalCustomRule = function (validationFunction) {
      /*
       * validationFunction should return {isValid: true/false, message?: "error message"}
       */
      if (typeof validationFunction !== "function") {
        throw new Error(
          "validationFunction is required and must be a function"
        );
      }

      this.globalCustomRules.push(validationFunction);
      return this;
    };

    /**
     * Clear custom rules for a specific control
     * @param {string} controlIdOrPath - Control ID or binding path
     * @returns {object} - This validator instance for chaining
     */
    Validator.prototype.clearCustomRules = function (controlIdOrPath) {
      if (this.customRules[controlIdOrPath]) {
        delete this.customRules[controlIdOrPath];
      }
      return this;
    };

    /**
     * Get all custom rules for a control (useful for debugging)
     * @param {string} controlIdOrPath - Control ID or binding path
     * @returns {array} - Array of custom validation functions
     */
    Validator.prototype.getCustomRules = function (controlIdOrPath) {
      return this.customRules[controlIdOrPath] || [];
    };

    // =============================================================================
    // CONSTRAINTS - SAPUI5 TYPE AND CONSTRAINT VALIDATION
    // =============================================================================
    // This section handles validation of SAPUI5 built-in types and constraints
    // like string length, numeric ranges, decimal precision, etc.

    /**
     * Validate required field constraint
     * @param {object} oControl - SAPUI5 control
     * @param {any} value - The control's value
     * @returns {object} - Validation result with isValid flag and message
     * @private
     */
    Validator.prototype._validateRequired = function (oControl, value) {
      var isRequired = this._isControlRequired(oControl);

      if (!isRequired) {
        return {
          isValid: true
        };
      }

      // Check for empty values
      var isEmpty = this._isEmpty(value, oControl);

      if (isEmpty) {
        return {
          isValid: false,
          message: this._getRequiredMessage(oControl)
        };
      }

      return {
        isValid: true
      };
    };

    /**
     * Get the required field error message
     * @param {object} oControl - SAPUI5 control
     * @returns {string} - Error message
     * @private
     */
    Validator.prototype._getRequiredMessage = function (oControl) {
      var controlLabel = this._getControlLabel(oControl);
      return this._getText("validator.required", [controlLabel]);
    };

    /**
     * Hybrid constraint validation approach
     * Pre-validates obvious constraint violations, then falls back to SAPUI5 validation
     * @param {object} oControl - SAPUI5 control
     * @param {any} value - The control's value
     * @returns {object} - Validation result with isValid flag and errors array
     * @private
     */
    Validator.prototype._validateConstraints = function (oControl, value) {
      var binding = this._getValueBinding(oControl);

      if (!binding || !binding.getType) {
        return {
          isValid: true,
          errors: []
        };
      }

      var oType = binding.getType();
      if (!oType) {
        return {
          isValid: true,
          errors: []
        };
      }

      var errors = [];
      var constraints = oType.getConstraints() || {};
      var controlLabel = this._getControlLabel(oControl);

      // First, check for obvious constraint violations before parsing
      var preValidationErrors = this._preValidateConstraints(
        value,
        constraints,
        controlLabel,
        oType
      );
      if (preValidationErrors.length > 0) {
        return {
          isValid: false,
          errors: preValidationErrors
        };
      }

      // If pre-validation passes, let SAPUI5 handle the full validation
      try {
        var internalValue = oType.parseValue(value, "string");
        oType.validateValue(internalValue);
        return {
          isValid: true,
          errors: []
        };
      } catch (oException) {
        // If SAPUI5 validation fails, provide a user-friendly message
        var errorMessage = this._createUserFriendlyErrorMessage(
          oException,
          oControl,
          value
        );
        errors.push(errorMessage);
        return {
          isValid: false,
          errors: errors
        };
      }
    };

    /**
     * Pre-validate obvious constraint violations to give better error messages
     * This catches the most common cases before SAPUI5 validation
     * @param {any} value - The value to validate
     * @param {object} constraints - The type constraints
     * @param {string} controlLabel - The control label
     * @param {object} oType - The SAPUI5 type object
     * @returns {array} - Array of error messages
     * @private
     */
    Validator.prototype._preValidateConstraints = function (
      value,
      constraints,
      controlLabel,
      oType
    ) {
      var errors = [];
      var typeName = oType.getMetadata().getName();

      // String length validations (most common case)
      if (this._isStringType(typeName)) {
        var stringValue = String(value || "");

        // Check minimum length first (more specific error for short strings)
        if (
          constraints.minLength !== undefined &&
          stringValue.length < constraints.minLength
        ) {
          errors.push(
            this._getText("validator.minLength", [
              controlLabel,
              constraints.minLength
            ])
          );
          return errors; // Return immediately to avoid multiple length errors
        }

        // Check maximum length
        if (
          constraints.maxLength !== undefined &&
          stringValue.length > constraints.maxLength
        ) {
          errors.push(
            this._getText("validator.maxLength", [
              controlLabel,
              constraints.maxLength
            ])
          );
          return errors;
        }
      }

      // Numeric validations (for obvious out-of-range values)
      if (this._isNumericType(typeName)) {
        // Only pre-validate if the value looks like a valid number
        var numericValue = this._tryParseNumber(value);
        if (numericValue !== null) {
          // Check minimum value first (more specific error for small numbers)
          if (
            constraints.minimum !== undefined &&
            numericValue < constraints.minimum
          ) {
            errors.push(
              this._getText("validator.minValue", [
                controlLabel,
                constraints.minimum
              ])
            );
            return errors;
          }

          // Check maximum value
          if (
            constraints.maximum !== undefined &&
            numericValue > constraints.maximum
          ) {
            errors.push(
              this._getText("validator.maxValue", [
                controlLabel,
                constraints.maximum
              ])
            );
            return errors;
          }

          if (this._looksLikeValidDecimal(value)) {
            var precisionError = this._checkDecimalPrecision(
              value,
              constraints,
              controlLabel
            );
            if (precisionError) {
              errors.push(precisionError);
              return errors;
            }

            var scaleError = this._checkDecimalScale(
              value,
              constraints,
              controlLabel
            );
            if (scaleError) {
              errors.push(scaleError);
              return errors;
            }
          }
        }
      }

      return errors; // No pre-validation errors found
    };

    /**
     * Check if a type is a string type
     * @param {string} typeName - The type name
     * @returns {boolean} - True if string type
     * @private
     */
    Validator.prototype._isStringType = function (typeName) {
      return (
        typeName === "sap.ui.model.type.String" ||
        typeName === "sap.ui.model.odata.type.String"
      );
    };

    /**
     * Check if a type is a numeric type
     * @param {string} typeName - The type name
     * @returns {boolean} - True if numeric type
     * @private
     */
    Validator.prototype._isNumericType = function (typeName) {
      return (
        typeName === "sap.ui.model.odata.type.Decimal" ||
        typeName === "sap.ui.model.odata.type.Int32" ||
        typeName === "sap.ui.model.odata.type.Int16" ||
        typeName === "sap.ui.model.type.Integer" ||
        typeName === "sap.ui.model.type.Float"
      );
    };

    /**
     * Try to parse a value as a number
     * @param {any} value - The value to parse
     * @returns {number|null} - Parsed number or null if invalid
     * @private
     */
    Validator.prototype._tryParseNumber = function (value) {
      if (value === null || value === undefined || value === "") {
        return null;
      }

      var num = parseFloat(String(value).replace(/,/g, ""));
      return isNaN(num) ? null : num;
    };

    /**
     * Check if a value looks like a valid decimal
     * @param {any} value - The value to check
     * @returns {boolean} - True if looks like valid decimal
     * @private
     */
    Validator.prototype._looksLikeValidDecimal = function (value) {
      if (!value) return false;
      var stringValue = String(value);
      // Simple regex to check if it looks like a decimal number
      return /^-?\d*\.?\d+$/.test(stringValue.replace(/,/g, ""));
    };

    /**
     * Check decimal precision constraint
     * @param {any} value - The value to check
     * @param {object} constraints - The constraints object
     * @param {string} controlLabel - The control label
     * @returns {string|null} - Error message or null if valid
     * @private
     */
    Validator.prototype._checkDecimalPrecision = function (
      value,
      constraints,
      controlLabel
    ) {
      if (constraints.precision === undefined) return null;

      var stringValue = String(value).replace(/[.,-]/g, "");
      if (stringValue.length > constraints.precision) {
        return this._getText("validator.maxDigits", [
          controlLabel,
          constraints.precision
        ]);
      }
      return null;
    };

    /**
     * Check decimal scale constraint
     * @param {any} value - The value to check
     * @param {object} constraints - The constraints object
     * @param {string} controlLabel - The control label
     * @returns {string|null} - Error message or null if valid
     * @private
     */
    Validator.prototype._checkDecimalScale = function (
      value,
      constraints,
      controlLabel
    ) {
      if (constraints.scale === undefined) return null;

      var stringValue = String(value);
      var decimalIndex = stringValue.indexOf(".");
      if (decimalIndex !== -1) {
        var decimalPlaces = stringValue.length - decimalIndex - 1;
        if (decimalPlaces > constraints.scale) {
          return this._getText("validator.maxDecimalPlaces", [
            controlLabel,
            constraints.scale
          ]);
        }
      }
      return null;
    };

    /**
     * Simplified user-friendly error message creation for cases that pass pre-validation
     * but still fail SAPUI5 validation (edge cases, format issues, etc.)
     * @param {object} oException - The SAPUI5 validation exception
     * @param {object} oControl - The SAPUI5 control
     * @param {any} value - The control's value
     * @returns {string} - User-friendly error message
     * @private
     */
    Validator.prototype._createUserFriendlyErrorMessage = function (
      oException,
      oControl,
      value
    ) {
      var controlLabel = this._getControlLabel(oControl);
      var binding = this._getValueBinding(oControl);
      var oType = binding ? binding.getType() : null;

      if (!oType) {
        return controlLabel + ": " + this._getText("validator.invalidValue");
      }

      var typeName = oType.getMetadata().getName();
      var constraints = oType.getConstraints() || {};

      // Since pre-validation passed, this is likely a format/parsing issue
      var message = this._getFormatErrorMessage(typeName, constraints);

      return controlLabel + ": " + message;
    };

    /**
     * Get format-specific error message based on type
     * @param {string} typeName - The SAPUI5 type name
     * @param {object} constraints - The type constraints
     * @returns {string} - Format error message
     * @private
     */
    Validator.prototype._getFormatErrorMessage = function (
      typeName,
      constraints
    ) {
      switch (typeName) {
        case "sap.ui.model.odata.type.Decimal":
          return this._getText("validator.invalidDecimalSimple");

        case "sap.ui.model.odata.type.Int32":
        case "sap.ui.model.odata.type.Int16":
          return this._getText("validator.invalidInteger");

        case "sap.ui.model.odata.type.Time":
          return this._getText("validator.invalidTime");

        case "sap.ui.model.odata.type.Date":
        case "sap.ui.model.odata.type.DateTime":
          return this._getText("validator.invalidDate");

        case "sap.ui.model.type.String":
        case "sap.ui.model.odata.type.String":
          return this._getText("validator.invalidText");

        default:
          return this._getText("validator.invalidValue");
      }
    };

    return Validator;
  }
);


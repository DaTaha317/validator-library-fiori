sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../utils/Validator",
	"sap/m/MessageToast",
	"../model/initialData"
], function(BaseController, JSONModel, Validator, MessageToast, initialData) {
	"use strict";

	return BaseController.extend("validation.library.controller.Test", {
		oViewModel: '',
		/********************* Begin Lifecycle methods *****************************/
		onInit: function() {
			this._initializeModel();
			this._initializeValidator();
			this._setupCustomValidationRules();
		},

		/********************* End Lifecycle methods *****************************/

		/********************* Begin Initialization *****************************/
		_initializeModel: function() {
			var initialDataCopy = Object.assign({}, initialData); // to maintain the original empty for clearing
			this.oViewModel = new JSONModel(initialDataCopy);
			this.setModel(this.oViewModel);
		},

		_initializeValidator: function() {
			var oResourceBundle = this.getResourceBundle();
			this.oValidator = new Validator(this, oResourceBundle);
			this.setModel(
				this.oValidator.oMessageManager.getMessageModel(),
				"message"
			);
		},
		/********************* End Initialization *****************************/

		/********************* Begin Custom Rules *****************************/
		_setupCustomValidationRules: function() {
			// Tax ID ( by control ID )
			this.oValidator.addCustomRule("taxId", function(value, oControl) {
				var taxRegex = /^\d{2}-\d{7}$/;
				return {
					isValid: taxRegex.test(value),
					message: "Please enter a valid tax number in the format 12-1234567"
				};
			});

			// End Date ( By Binding Path )
			this.oValidator.addCustomRule("/endDate", function(value, oControl) {
				var startDate = this.oViewModel.getProperty("/startDate");
				var endDate = this.oViewModel.getProperty("/endDate");

				return {
					isValid: endDate >= startDate,
					message: "End date must be equal to or after start date"
				};
			}.bind(this));

			// End Time ( By Binding Path )
			this.oValidator.addCustomRule("/endTime", function(value, oControl) {
				var startTime = this.oViewModel.getProperty("/startTime");
				var endTime = this.oViewModel.getProperty("/endTime");

				return {
					isValid: endTime > startTime,
					message: "End time must be after start time"
				};
			}.bind(this));

			// Attachment validation
			this.oValidator.addGlobalCustomRule(function() {
				var aAttachments = this.oViewModel.getProperty("/attachments");
				return {
					isValid: aAttachments.length > 0,
					message: "Attachment is mandatory"
				};
			}.bind(this));
		},
		// Live Change validation
		onRealTimeValidation: function(oEvent) {
			this.oValidator.validateControl(oEvent.getSource());
		},
		/********************* End Custom Rules *****************************/

		/********************* Begin validation buttons methods *****************************/
		onValidateGroup: function(sFieldGroupId) {
			var aControls = this.getView().getControlsByFieldGroupId(sFieldGroupId);
			var bResult = this.oValidator.validateControls(aControls);

			MessageToast.show(bResult ? "Validation passed successfully" : "Validation failed");
		},
		onGenericValidate: function(oEvent) {
			var oButton = oEvent.getSource();
			var sFullId = oButton.getId(); // e.g. "__xmlview0--validateBasicBtn"
			var sLocalId = sFullId.split("--").pop(); // "validateBasicBtn"

			var oMap = {
				"validateBasicBtn": "basicValidation",
				"validateNumericBtn": "numericValidation",
				"validateDatetimeBtn": "dateValidation",
				"validateComplexBtn": "complexValidation"
			};

			var sGroupId = oMap[sLocalId];
			if (sGroupId) {
				this.onValidateGroup(sGroupId);
			}
		},

		onValidateAll: function() {
			var aAllControls = [];
			var aGroupIds = ["basicValidation", "numericValidation", "dateValidation", "complexValidation"];

			aGroupIds.forEach(function(sGroupId) {
				var aControls = this.getView().getControlsByFieldGroupId(sGroupId);
				aAllControls = aAllControls.concat(aControls);
			}.bind(this));

			var bResult = this.oValidator.validateControls(aAllControls);

			MessageToast.show(bResult ? "All Validation passed successfully" : "Validation failed");
		},

		onClearAll: function() {
			var initialDataCopy = Object.assign({}, initialData); // to maintain the original empty for clearing
			var oModel = this.getModel();
			oModel.setData(initialDataCopy);
			this.oValidator.oMessageManager.removeAllMessages();

			this.getView().findElements(true).forEach(function(oElement) {
				if (oElement.setValueState) {
					oElement.setValueState("None");
				}
			});
		},

		onMessagesButtonPress: function(oEvent) {
			this.oValidator.showMessagePopover(oEvent.getSource());
		},
		/********************* End validation buttons methods *****************************/

		/********************* Begin attachment *****************************/

		onValidateAttachment: function() {
			var bResult = this.oValidator.validateGlobalCustomRules();
		},

		onAddAttachment: function() {
			var aAttachments = this.oViewModel.getProperty("/attachments");

			// Generate dummy attachment data
			var oNewAttachment = {
				id: "att_" + Date.now(),
				fileName: "New_Document_" + (aAttachments.length + 1) + ".pdf",
				extension: ".pdf",
				fileSize: "1.2 MB"
			};

			aAttachments.push(oNewAttachment);
			this.oViewModel.setProperty("/attachments", aAttachments);

		},

		onDeleteAttachment: function(oEvent) {
				var aAttachments = this.oViewModel.getProperty("/attachments");
				var oBindingContext = oEvent.getSource().getBindingContext();
				var sPath = oBindingContext.getPath();
				var iIndex = parseInt(sPath.split("/")[2]);

				// Remove the attachment from the array
				aAttachments.splice(iIndex, 1);
				this.oViewModel.setProperty("/attachments", aAttachments);

			}
			/********************* End attachment *****************************/
	});
});
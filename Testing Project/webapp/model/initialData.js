sap.ui.define([], function() {
	"use strict";

	return {
		// All your original oData content
		firstName: "",
		lastName: "",
		middleName: "",
		username: "",
		description: "",
		shortCode: "",

		age: null,
		employeeId: null,
		quantity: null,
		price: null,
		percentage: null,
		weight: null,
		salary: null,

		startDate: null,
		endDate: null,
		startTime: null,
		endTime: null,

		department: "",

		taxId: "",

		attachments: [],

		departments: [{
			key: "IT",
			text: "Information Technology"
		}, {
			key: "HR",
			text: "Human Resources"
		}, {
			key: "FIN",
			text: "Finance"
		}, {
			key: "MKT",
			text: "Marketing"
		}, {
			key: "OPS",
			text: "Operations"
		}]
	};
});
sap.ui.define(
	[
		"sap/ui/core/Control",
		"sap/m/MultiInput",
		"sap/m/Token",
		"sap/m/ColumnListItem",
		"sap/m/Label",
		"sap/m/Text",
		"sap/m/Column",
		"sap/ui/table/Column",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
		"sap/ui/comp/valuehelpdialog/ValueHelpDialog",
		"sap/ui/comp/filterbar/FilterBar",
		"sap/ui/comp/filterbar/FilterGroupItem",
		"sap/m/Input"
	],
	function(
		Control,
		MultiInput,
		Token,
		ColumnListItem,
		Label,
		Text,
		MColumn,
		UIColumn,
		Filter,
		FilterOperator,
		ValueHelpDialog,
		FilterBar,
		FilterGroupItem,
		Input
	) {
		"use strict";

		// Get MultiInput metadata to dynamically create properties
		var oMultiInputMetadata = MultiInput.getMetadata();
		var mMultiInputProperties = oMultiInputMetadata.getAllProperties();
		var mMultiInputAggregations = oMultiInputMetadata.getAllAggregations();
		var mMultiInputEvents = oMultiInputMetadata.getAllEvents();

		// Create metadata object with forwarded properties
		var oMetadata = {
			properties: {
				// Custom properties specific to the wrapper
				config: {
					type: "object",
					defaultValue: {}
				},
				hidden: {
					type: "boolean",
					defaultValue: false
				},
				singleMode: {
					type: "boolean",
					defaultValue: false
				},
				// Add busy properties
				busy: {
					type: "boolean",
					defaultValue: false
				},
				busyIndicatorDelay: {
					type: "int",
					defaultValue: 1000
				}
			},
			aggregations: {
				_multiInput: {
					type: "sap.m.MultiInput",
					multiple: false,
					visibility: "hidden"
				}
			},
			events: {
				selectionChange: {
					parameters: {
						selectedTokens: {
							type: "sap.m.Token[]"
						}
					}
				}
			}
		};

		// Forward all MultiInput properties except ones we handle specially
		var aExcludedProperties = ["busy", "busyIndicatorDelay"]; // Exclude busy properties to handle them specially

		Object.keys(mMultiInputProperties).forEach(function(sPropertyName) {
			if (aExcludedProperties.indexOf(sPropertyName) === -1) {
				var oProperty = mMultiInputProperties[sPropertyName];
				oMetadata.properties[sPropertyName] = {
					type: oProperty.type,
					defaultValue: oProperty.defaultValue,
					group: oProperty.group
				};
			}
		});

		// Forward MultiInput aggregations (except tokens which we handle specially)
		var aExcludedAggregations = [
			"tokens",
			"suggestionItems",
			"suggestionColumns"
		];

		Object.keys(mMultiInputAggregations).forEach(function(sAggregationName) {
			if (aExcludedAggregations.indexOf(sAggregationName) === -1) {
				var oAggregation = mMultiInputAggregations[sAggregationName];
				oMetadata.aggregations[sAggregationName] = {
					type: oAggregation.type,
					multiple: oAggregation.multiple,
					singularName: oAggregation.singularName
				};
			}
		});

		// Forward MultiInput events (except ones we handle specially)
		var aExcludedEvents = ["valueHelpRequest"];

		Object.keys(mMultiInputEvents).forEach(function(sEventName) {
			if (aExcludedEvents.indexOf(sEventName) === -1) {
				var oEventMetadata = mMultiInputEvents[sEventName];
				oMetadata.events[sEventName] = {
					parameters: oEventMetadata.getParameters ? oEventMetadata.getParameters() : {}
				};
			}
		});

		return Control.extend("validation.library.controls.ValueHelperWrapper", {
			metadata: oMetadata,

			init: function() {
				this._oMultiInput = new MultiInput({
					valueHelpRequest: this.onValueHelpRequested.bind(this),
					showValueHelp: true,
					valueHelpOnly: true
				});
				this._oMultiInput.addValidator(this._onMultiInputValidate);
				this.setAggregation("_multiInput", this._oMultiInput);

				// Set up property forwarding
				this._setupPropertyForwarding();
				this._setupEventForwarding();
				this._setupAggregationForwarding();
			},

			onAfterRendering: function() {
				this._oView = this._getView();
				this._oConfig = this.getConfig() || {};
				this._applyHiddenStyle();
			},

			// Set up automatic property forwarding
			_setupPropertyForwarding: function() {
				var that = this;
				var aExcludedProperties = ["config", "hidden", "busy", "busyIndicatorDelay"]; // Exclude custom properties

				Object.keys(mMultiInputProperties).forEach(function(sPropertyName) {
					if (aExcludedProperties.indexOf(sPropertyName) === -1) {
						// Override setter to forward to MultiInput
						var sSetterName =
							"set" +
							sPropertyName.charAt(0).toUpperCase() +
							sPropertyName.slice(1);
						var sGetterName =
							"get" +
							sPropertyName.charAt(0).toUpperCase() +
							sPropertyName.slice(1);

						that[sSetterName] = function(vValue) {
							this.setProperty(sPropertyName, vValue, true); // suppress re-rendering
							if (this._oMultiInput && this._oMultiInput[sSetterName]) {
								this._oMultiInput[sSetterName](vValue);
							}
							return this;
						};
					}
				});
			},

			// Set up automatic event forwarding
			_setupEventForwarding: function() {
				var that = this;
				var aExcludedEvents = ["valueHelpRequest", "selectionChange"];

				Object.keys(mMultiInputEvents).forEach(function(sEventName) {
					if (aExcludedEvents.indexOf(sEventName) === -1) {
						// Attach to MultiInput event and forward to wrapper
						that._oMultiInput.attachEvent(sEventName, function(oEvent) {
							that.fireEvent(sEventName, oEvent.getParameters());
						});
					}
				});
			},

			// Set up automatic aggregation forwarding
			_setupAggregationForwarding: function() {
				var that = this;
				var aExcludedAggregations = [
					"_multiInput",
					"tokens",
					"suggestionItems",
					"suggestionColumns"
				];

				Object.keys(mMultiInputAggregations).forEach(function(
					sAggregationName
				) {
					if (aExcludedAggregations.indexOf(sAggregationName) === -1) {
						var oAggregation = mMultiInputAggregations[sAggregationName];

						// Override aggregation methods to forward to MultiInput
						var sAddMethodName =
							"add" +
							(oAggregation.singularName || sAggregationName)
							.charAt(0)
							.toUpperCase() +
							(oAggregation.singularName || sAggregationName).slice(1);
						var sRemoveMethodName =
							"remove" +
							(oAggregation.singularName || sAggregationName)
							.charAt(0)
							.toUpperCase() +
							(oAggregation.singularName || sAggregationName).slice(1);
						var sRemoveAllMethodName =
							"removeAll" +
							sAggregationName.charAt(0).toUpperCase() +
							sAggregationName.slice(1);
						var sGetMethodName =
							"get" +
							sAggregationName.charAt(0).toUpperCase() +
							sAggregationName.slice(1);

						if (that._oMultiInput[sAddMethodName]) {
							that[sAddMethodName] = function(oObject) {
								return this._oMultiInput[sAddMethodName](oObject);
							};
						}

						if (that._oMultiInput[sRemoveMethodName]) {
							that[sRemoveMethodName] = function(oObject) {
								return this._oMultiInput[sRemoveMethodName](oObject);
							};
						}

						if (that._oMultiInput[sRemoveAllMethodName]) {
							that[sRemoveAllMethodName] = function() {
								return this._oMultiInput[sRemoveAllMethodName]();
							};
						}

						if (that._oMultiInput[sGetMethodName]) {
							that[sGetMethodName] = function() {
								return this._oMultiInput[sGetMethodName]();
							};
						}
					}
				});
			},

			/********************* Begin Value Help Dialog *****************************/

			_createValueHelpDialog: function() {
				// Create FilterBar programmatically
				var oFilterBar = new FilterBar({
					advancedMode: true,
					search: this.onFilterBarSearch.bind(this)
				});

				// Create the ValueHelpDialog programmatically
				var oDialog = new ValueHelpDialog({
					ok: this.onValueHelpOkPress.bind(this),
					cancel: this.onValueHelpCancelPress.bind(this),
					afterClose: this.onValueHelpAfterClose.bind(this),
					supportRanges: false,
					filterBar: oFilterBar
				});

				return oDialog;
			},

			onValueHelpRequested: function() {
				// Create dialog programmatically
				var oDialog = this._createValueHelpDialog();
				var oFilterBar = oDialog.getFilterBar();

				this._oVHD = oDialog;
				this.addDependent(oDialog);

				// Set the key and descriptionKey programmatically
				this._oVHD.setKey(this._oConfig.selectedKey);
				this._oVHD.setDescriptionKey(this._oConfig.selectedDescription);

				// Add filter fields dynamically
				if (oFilterBar && this._oConfig.fields) {
					this._oConfig.fields.forEach(function(field) {
						if (field.filter) {
							var oFilterGroupItem = new FilterGroupItem({
								groupName: "__$INTERNAL$",
								name: field.code,
								label: field.label,
								visibleInFilterBar: true,
								control: new Input({
									name: field.code
								})
							});
							oFilterBar.addFilterGroupItem(oFilterGroupItem);
						}
					});
				}

				// Configure table with busy properties
				oDialog.getTableAsync().then(
					function(oTable) {
						// Set single selection mode based on table type
						this._setTableSingleSelectionMode(oTable);

						// Apply busy properties to table
						this._applyBusyPropertiesToTable(oTable);

						// Attach selection change handler
						this._attachSelectionChangeHandler(oTable, oDialog);

						// For Desktop and Tablet (sap.ui.table.Table)
						if (oTable.bindRows) {
							oTable.bindAggregation("rows", {
								path: this._oConfig.entitySet,
								filters: this._oConfig.filters,
								events: {
									dataRequested: function(oEvent) {
										// Implement smart busy state management
										this._handleDataRequested(oTable);
									}.bind(this),
									dataReceived: function(oEvent) {
										// Clear selections when new data is received (for single selection)
										if (this.getSingleMode()) {
											oTable.clearSelection();
											oDialog.setTokens([]);
										}
										// Remove busy state when data is received
										this._handleDataReceived(oTable);
										oDialog.update();
									}.bind(this)
								}
							});

							// Create columns dynamically
							this._oConfig.fields.forEach((field) => {
								let oColumn = new UIColumn({
									label: new Label({
										text: field.label
									}),
									template: new Text({
										wrapping: false,
										text: {
											path: field.code,
											formatter: field.code
										}
									})
								});

								oColumn.data({
									fieldName: field.code
								});
								oTable.addColumn(oColumn);
							});
						}

						// For Mobile (sap.m.Table)
						if (oTable.bindItems) {
							oTable.bindAggregation("items", {
								path: this._oConfig.entitySet,
								filters: this._oConfig.filters,
								template: new ColumnListItem({
									cells: this._oConfig.fields.map(
										(field) =>
										new Label({
											text: {
												path: field.code,
												formatter: field.code
											}
										})
									)
								}),
								events: {
									dataRequested: function(oEvent) {
										// Implement smart busy state management
										this._handleDataRequested(oTable);
									}.bind(this),
									dataReceived: function() {
										// Clear selections when new data is received (for single selection)
										if (this.getSingleMode()) {
											oTable.removeSelections(true);
											oDialog.setTokens([]);
										}
										// Remove busy state when data is received
										this._handleDataReceived(oTable);
										oDialog.update();
									}.bind(this)
								}
							});

							// Create mobile table columns dynamically
							this._oConfig.fields.forEach((field) => {
								oTable.addColumn(
									new MColumn({
										header: new Label({
											text: field.label
										})
									})
								);
							});
						}

						oDialog.update();
					}.bind(this)
				);

				oDialog.setTokens(this._oMultiInput.getTokens());
				oDialog.open();
			},

			onFilterBarSearch: function(oEvent) {
				var aSelectionSet = oEvent.getParameter("selectionSet");

				var aFilters = aSelectionSet.reduce(function(aResult, oControl) {
					if (oControl.getValue()) {
						aResult.push(
							new Filter({
								path: oControl.getName(),
								operator: FilterOperator.Contains,
								value1: oControl.getValue()
							})
						);
					}

					return aResult;
				}, []);

				// If no filters are applied, pass null to show all data
				var oFilter = aFilters.length > 0 ? new Filter({
					filters: aFilters,
					and: true
				}) : null;

				this._filterTable(oFilter);
			},

			onValueHelpOkPress: function(oEvent) {
				var aTokens = oEvent.getParameter("tokens");
				this._oMultiInput.setTokens(aTokens);
				this._oVHD.close();

				// Fire the custom event with selected tokens
				this.fireSelectionChange({
					selectedTokens: aTokens
				});
			},

			onValueHelpCancelPress: function() {
				this._oVHD.close();
			},

			onValueHelpAfterClose: function() {
				// Clean up busy state tracking when dialog closes
				this._cleanupBusyStateTracking();
				this._oVHD.destroy();
			},

			/********************* End Value Help Dialog *****************************/

			/********************* Begin Internal helper methods *****************************/

			_getView: function() {
				var oParent = this.getParent();
				while (oParent) {
					if (oParent instanceof sap.ui.core.mvc.View) {
						return oParent;
					}
					oParent = oParent.getParent();
				}
				return null;
			},

			_onMultiInputValidate: function(oArgs) {
				var sWhitespace = " ",
					sUnicodeWhitespaceCharacter = "\u00A0"; // Non-breaking whitespace

				if (oArgs.suggestionObject) {
					var oObject = oArgs.suggestionObject.getBindingContext().getObject(),
						oToken = new Token(),
						sOriginalText = oObject.ProductCode.replaceAll(
							sWhitespace + sWhitespace,
							sWhitespace + sUnicodeWhitespaceCharacter
						);

					oToken.setKey(oObject.ProductCode);
					oToken.setText(oObject.ProductName + " (" + sOriginalText + ")");
					return oToken;
				}
				return null;
			},

			_filterTable: function(oFilter) {
				var oVHD = this._oVHD;

				oVHD.getTableAsync().then(function(oTable) {
					// Use smart busy state management for filtering
					this._handleDataRequested(oTable);

					// Clear table selection and dialog tokens when new data is loaded
					if (this.getSingleMode()) {
						// Clear table selection
						if (oTable.clearSelection) {
							oTable.clearSelection();
						}
						// Clear dialog tokens
						oVHD.setTokens([]);
					}

					if (oTable.bindRows) {
						oTable.getBinding("rows").filter(oFilter || []);
					}
					if (oTable.bindItems) {
						oTable.getBinding("items").filter(oFilter || []);
					}

					// This method must be called after binding update of the table.
					oVHD.update();

					// Simulate data received after a short delay for filtering
					setTimeout(function() {
						this._handleDataReceived(oTable);
					}.bind(this), 50);
				}.bind(this));
			},

			// Handle selection change to enforce single selection behavior
			_attachSelectionChangeHandler: function(oTable, oDialog) {
				var that = this;

				// For Desktop/Tablet table (sap.ui.table.Table)
				if (oTable.attachRowSelectionChange) {
					oTable.attachRowSelectionChange(function(oEvent) {
						that._handleTableSelectionChange(oTable, oDialog, oEvent);
					});
				}

				// For Mobile table (sap.m.Table)
				if (oTable.attachSelectionChange) {
					oTable.attachSelectionChange(function(oEvent) {
						that._handleTableSelectionChange(oTable, oDialog, oEvent);
					});
				}
			},

			_handleTableSelectionChange: function(oTable, oDialog, oEvent) {
				// Only handle single selection mode
				if (this.getSingleMode()) {
					var aSelectedIndices = [];

					// Get selected indices based on table type
					if (oTable.getSelectedIndices) {
						// sap.ui.table.Table
						aSelectedIndices = oTable.getSelectedIndices();
					} else if (oTable.getSelectedItems) {
						// sap.m.Table
						var aSelectedItems = oTable.getSelectedItems();
						aSelectedIndices = aSelectedItems.map(function(oItem) {
							return oTable.indexOfItem(oItem);
						});
					}

					// If more than one item is selected, keep only the last one
					if (aSelectedIndices.length > 1) {
						// Clear all selections
						if (oTable.clearSelection) {
							oTable.clearSelection();
						}

						// Select only the last selected item
						var iLastSelectedIndex = aSelectedIndices[aSelectedIndices.length - 1];

						if (oTable.setSelectedIndex) {
							// sap.ui.table.Table
							oTable.setSelectedIndex(iLastSelectedIndex);
						} else if (oTable.getItems && oTable.setSelectedItem) {
							// sap.m.Table
							var oLastSelectedItem = oTable.getItems()[iLastSelectedIndex];
							if (oLastSelectedItem) {
								oTable.setSelectedItem(oLastSelectedItem, true);
							}
						}
					}

					// Update dialog tokens based on current selection
					this._updateDialogTokensFromSelection(oTable, oDialog);
				}
			},

			_updateDialogTokensFromSelection: function(oTable, oDialog) {
				var aTokens = [];
				var aSelectedIndices = [];

				// Get selected indices based on table type
				if (oTable.getSelectedIndices) {
					aSelectedIndices = oTable.getSelectedIndices();
				} else if (oTable.getSelectedItems) {
					var aSelectedItems = oTable.getSelectedItems();
					aSelectedIndices = aSelectedItems.map(function(oItem) {
						return oTable.indexOfItem(oItem);
					});
				}

				// For single selection mode, ensure only one token exists
				if (this.getSingleMode()) {
					// Always clear existing tokens first
					oDialog.setTokens([]);

					// Only process the last selected item (in case of multiple selections)
					if (aSelectedIndices.length > 0) {
						var iLastIndex = aSelectedIndices[aSelectedIndices.length - 1];
						var oContext;

						if (oTable.getContextByIndex) {
							// sap.ui.table.Table
							oContext = oTable.getContextByIndex(iLastIndex);
						} else if (oTable.getItems) {
							// sap.m.Table
							var oItem = oTable.getItems()[iLastIndex];
							if (oItem) {
								oContext = oItem.getBindingContext();
							}
						}

						if (oContext) {
							var oData = oContext.getObject();
							var oToken = new Token({
								key: oData[this._oConfig.selectedKey],
								text: oData[this._oConfig.selectedDescription] || oData[this._oConfig.selectedKey]
							});
							aTokens.push(oToken);
						}
					}
				} else {
					// For multi-selection mode, create tokens for all selected items
					aSelectedIndices.forEach(function(iIndex) {
						var oContext;

						if (oTable.getContextByIndex) {
							// sap.ui.table.Table
							oContext = oTable.getContextByIndex(iIndex);
						} else if (oTable.getItems) {
							// sap.m.Table
							var oItem = oTable.getItems()[iIndex];
							if (oItem) {
								oContext = oItem.getBindingContext();
							}
						}

						if (oContext) {
							var oData = oContext.getObject();
							var oToken = new Token({
								key: oData[this._oConfig.selectedKey],
								text: oData[this._oConfig.selectedDescription] || oData[this._oConfig.selectedKey]
							});
							aTokens.push(oToken);
						}
					}.bind(this));
				}

				// Set the tokens (replacing any existing ones)
				oDialog.setTokens(aTokens);
			},

			_handleDataRequested: function(oTable) {
				var iBusyDelay = this.getBusyIndicatorDelay();
				var sTableId = oTable.getId();

				// Store the timestamp when data was requested
				this._aDataRequestTimestamps = this._aDataRequestTimestamps || {};
				this._aBusyTimeouts = this._aBusyTimeouts || {};

				this._aDataRequestTimestamps[sTableId] = Date.now();

				// Clear any existing timeout for this table
				if (this._aBusyTimeouts[sTableId]) {
					clearTimeout(this._aBusyTimeouts[sTableId]);
					delete this._aBusyTimeouts[sTableId];
				}

				// Set busy state only after the delay
				this._aBusyTimeouts[sTableId] = setTimeout(function() {
					// Only show busy if data request is still pending
					if (this._aDataRequestTimestamps[sTableId]) {
						oTable.setBusy(true);
					}
					delete this._aBusyTimeouts[sTableId];
				}.bind(this), iBusyDelay);
			},

			_handleDataReceived: function(oTable) {
				var sTableId = oTable.getId();

				// Initialize arrays if not exists
				this._aDataRequestTimestamps = this._aDataRequestTimestamps || {};
				this._aBusyTimeouts = this._aBusyTimeouts || {};

				// Clear the request timestamp
				if (this._aDataRequestTimestamps[sTableId]) {
					delete this._aDataRequestTimestamps[sTableId];
				}

				// Clear the timeout if it's still pending (data received before delay)
				if (this._aBusyTimeouts[sTableId]) {
					clearTimeout(this._aBusyTimeouts[sTableId]);
					delete this._aBusyTimeouts[sTableId];
				}

				// Always remove busy state when data is received
				oTable.setBusy(false);
			},

			// Clean up busy state tracking
			_cleanupBusyStateTracking: function() {
				// Clear all pending timeouts
				if (this._aBusyTimeouts) {
					Object.keys(this._aBusyTimeouts).forEach(function(sTableId) {
						clearTimeout(this._aBusyTimeouts[sTableId]);
					}.bind(this));
					this._aBusyTimeouts = {};
				}

				// Clear request timestamps
				this._aDataRequestTimestamps = {};
			},

			// Apply busy properties to the table
			_applyBusyPropertiesToTable: function(oTable) {
				if (oTable) {
					oTable.setBusy(this.getBusy());
					oTable.setBusyIndicatorDelay(this.getBusyIndicatorDelay());
				}
			},

			// Helper method to set single selection mode based on table type
			_setTableSingleSelectionMode: function(oTable) {
				if (this.getSingleMode()) {
					if (oTable.setSelectionMode) {
						// sap.ui.table.Table (Desktop/Tablet)
						oTable.setSelectionMode("Single");
					} else if (oTable.setMode) {
						// sap.m.Table (Mobile)
						oTable.setMode("SingleSelect");
					}
				}
			},

			// Apply CSS to make the multiInput almost invisible yet accessible
			_applyHiddenStyle: function() {
				if (this.getHidden()) {
					this._oMultiInput.getDomRef().setAttribute(
						"style",
						`
            width: 1px !important;
            height: 1px !important;
            padding: 0 !important;
            margin: 0 !important;
            opacity: 0 !important;
            pointer-events: none !important;
            position: absolute !important;
        `
					);
				}
			},

			/********************* Begin Public Methods *****************************/

			clearTokens: function() {
				this._oMultiInput.removeAllTokens();
			},

			openValueHelpDialog: function() {
				this.onValueHelpRequested();
			},

			// Special handling for editable property
			setEditable: function(bEditable) {
				this.setProperty("editable", bEditable, true); // suppress re-rendering
				if (this._oMultiInput) {
					this._oMultiInput.setEditable(bEditable);
				}
				return this;
			},

			// Special handling for busy property
			setBusy: function(bBusy) {
				this.setProperty("busy", bBusy, true); // suppress re-rendering
				// If dialog is open, apply to the table
				if (this._oVHD) {
					this._oVHD.getTableAsync().then(function(oTable) {
						oTable.setBusy(bBusy);
					});
				}
				return this;
			},

			// Special handling for busyIndicatorDelay property
			setBusyIndicatorDelay: function(iDelay) {
				this.setProperty("busyIndicatorDelay", iDelay, true); // suppress re-rendering
				// If dialog is open, apply to the table
				if (this._oVHD) {
					this._oVHD.getTableAsync().then(function(oTable) {
						oTable.setBusyIndicatorDelay(iDelay);
					});
				}
				return this;
			},

			// Token-related methods (forwarded to MultiInput)
			getTokens: function() {
				return this._oMultiInput.getTokens();
			},

			setTokens: function(aTokens) {
				this._oMultiInput.setTokens(aTokens);
				return this;
			},

			addToken: function(oToken) {
				this._oMultiInput.addToken(oToken);
				return this;
			},

			removeToken: function(oToken) {
				this._oMultiInput.removeToken(oToken);
				return this;
			},

			removeAllTokens: function() {
				this._oMultiInput.removeAllTokens();
				return this;
			},

			/********************* End Public Methods *****************************/

			/********************* End Internal helper methods *****************************/

			renderer: {
				render: function(oRm, oControl) {
					oRm.renderControl(oControl.getAggregation("_multiInput"));
				}
			}
		});
	}
);
var prefix = window.location.pathname.substr(0, window.location.pathname.toLowerCase().lastIndexOf("/extensions") + 1);
var config = {
	host: window.location.hostname,
	prefix: prefix,
	port: window.location.port,
	isSecure: window.location.protocol === "https:"
};

var currentUser;
var oldFontSize;
var oldCommentView = null;
var oldCommentLevel = null;
var initFirebase;
var rendered;
var editMode = 0;
var oldCommentRef;
var ref;
var oldRef;

require.config({
	paths: {
		'firebase': 'https://www.gstatic.com/firebasejs/5.0.4/firebase'
	}
})

define([
	'qlik',
	'jquery',
	'firebase',
	'text!./fireComment.html',
	'text!./trafficLight.html',
	'text!./leonardo-ui.css',
	'text!./fireComment.css',
	'./config',
	'./leonardo-ui',
	'./properties'
],
	function (qlik, $, firebase, html, trafficHtml, leoCss, fireCss, configFile, leoJs, prop) {
		return {
			definition: prop,
			support: {
				snapshot: false,
				export: true,
				exportData: false
			},
			paint: async function ($element, layout) {
				if (window['oldFontSize' + layout.qInfo.qId] != layout.fontSize ||
					window['oldRedColor' + layout.qInfo.qId] != layout.redColor ||
					window['oldAmberColor' + layout.qInfo.qId] != layout.amberColor ||
					window['oldGreenColor' + layout.qInfo.qId] != layout.greenColor) {
					$(`#fireCss_${layout.qInfo.qId}`).remove();
					css = fireCss.replace(/fontVariable/g, layout.fontSize);
					css = fireCss.replace(/fontVariable/g, layout.fontSize);
					css = css.replace(/LAYOUTID/g, layout.qInfo.qId);
					css = css.replace(/redColor/g, layout.redColor);
					css = css.replace(/amberColor/g, layout.amberColor);
					css = css.replace(/greenColor/g, layout.greenColor);
					$(`<style id="fireCss_${layout.qInfo.qId}">`).html(css).appendTo("head");
					window['oldFontSize' + layout.qInfo.qId] = layout.fontSize;
					window['oldRedColor' + layout.qInfo.qId] = layout.oldRedColor;
					window['oldAmberColor' + layout.qInfo.qId] = layout.oldAmberColor;
					window['oldGreenColor' + layout.qInfo.qId] = layout.oldGreenColor;
				}

				if(window['oldCommentView' + layout.qInfo.qId] != layout.commentView) {
					if(window['oldCommentRef' + layout.qInfo.qId]) {
						window['oldCommentRef' + layout.qInfo.qId].off();
					}
					$element.empty();
					window['oldCommentView' + layout.qInfo.qId] = layout.commentView;
				}
				if(layout.commentView =='tfl'){
					var fireIconPanel =  $('#fireIconPanel2_' + layout.qInfo.qId);
				}
				else {
					var fireIconPanel = $('#fireIconPanel_' + layout.qInfo.qId);
				}

				if (!fireIconPanel.length) {
					
					window['oldCommentRef' + layout.qInfo.qId] = null;
					window['commentRef' + layout.qInfo.qId] = null;
					window['ref' + layout.qInfo.qId] = null;
					window['oldRef' + layout.qInfo.qId] = null;
					if (layout.commentView == 'tfl') {
						finalHtml = trafficHtml.replace(/LAYOUTID/g, layout.qInfo.qId);
						$element.append(finalHtml);
					}
					else {
						finalHtml = html.replace(/LAYOUTID/g, layout.qInfo.qId);
						$element.append(finalHtml);
					}

					// Get current user
					var global = qlik.getGlobal(config);
					global.getAuthenticatedUser(function (reply) {
						currentUser = reply.qReturn;
						currentUser = currentUser.replace('UserDirectory=', '');
						currentUser = currentUser.replace('; UserId=', '_');
					});

					// Init firebase
					if (!initFirebase) {
						firebase = await firebase.initializeApp(config);
						initFirebase = true;
						// Sign into Firebase
						firebase.auth().signInAnonymously().catch(function (error) {
							var errorCode = error.code;
							var errorMessage = error.message;
						});
					}

					// On click plus icon
					$('#addButton_' + layout.qInfo.qId).click(function () {
						$('#editButton_' + layout.qInfo.qId).hide();
						$('#fireTextArea_' + layout.qInfo.qId).val('');
						$('#fireContainer_' + layout.qInfo.qId).show();
						$('#addButton_' + layout.qInfo.qId).hide();
						$('#fireContent_' + layout.qInfo.qId).hide();
					});


					// On click edit icon
					$('#editButton_' + layout.qInfo.qId).click(function () {
						editMode = 1;
						$('#editButton_' + layout.qInfo.qId).hide();
						$('#addButton_' + layout.qInfo.qId).hide();
						$('#closeButton_' + layout.qInfo.qId).show();
						// add delete icon to comments made by current user
						$("*[id*=" + currentUser + "]:visible").each(function () {
							$(this).find('.lui-icon.lui-icon--bin').show();
						});
						// On click delete icon callback
						$(".lui-icon.lui-icon--bin").click(async function () {
							var ts = $(this)[0].parentElement.id;
							var tsSplit = ts.split('_');
							var id = tsSplit[2];
							deleteComments(id);
						})
					});

					// On click close button
					$('#closeButton_' + layout.qInfo.qId).click(function () {
						editMode = 0;
						$('#editButton_' + layout.qInfo.qId).show();
						$('#addButton_' + layout.qInfo.qId).show();
						$('#closeButton_' + layout.qInfo.qId).hide();
						$(".lui-icon.lui-icon--bin").hide();
					});

					// On click cancel button
					$('#cancelButton_' + layout.qInfo.qId).click(function () {
						$('#editButton_' + layout.qInfo.qId).show();
						$('#fireContainer_' + layout.qInfo.qId).hide();
						$('#addButton_' + layout.qInfo.qId).show();
						$('#fireContent_' + layout.qInfo.qId).show();
					});

					// On click save button write to DB
					$('#saveButton_' + layout.qInfo.qId).click(async function () {
						currentSelections = await getCurrentSelections();
						milliseconds = await (new Date).getTime();
						comments = await writeNewComment(milliseconds, currentUser, $('#fireTextArea_' + layout.qInfo.qId).val());
						$('#fireContainer_' + layout.qInfo.qId).hide();
						$('#addButton_' + layout.qInfo.qId).show();
						$('#fireContent_' + layout.qInfo.qId).show();
						$('#editButton_' + layout.qInfo.qId).show();
					});

					// On click radio buttons
					$(`#green_${layout.qInfo.qId}`).click(function () {
						if ($(`#green_${layout.qInfo.qId}`).hasClass("green_" + layout.qInfo.qId)) {
							writeNewComment(null, currentUser, 0);
						}
						else {
							writeNewComment(null, currentUser, 1);
						}

					})
					$(`#yellow_${layout.qInfo.qId}`).click(function () {
						if ($(`#yellow_${layout.qInfo.qId}`).hasClass("yellow_" + layout.qInfo.qId)) {
							writeNewComment(null, currentUser, 0);
						}
						else {
							writeNewComment(null, currentUser, 2);
						}
					})
					$(`#red_${layout.qInfo.qId}`).click(function () {
						if ($(`#red_${layout.qInfo.qId}`).hasClass("red_" + layout.qInfo.qId)) {
							writeNewComment(null, currentUser, 0);
						}
						else {
							writeNewComment(null, currentUser, 3);
						}
					})

					// Get current app and appid
					var app = qlik.currApp(this);
					var appId = app.id;

					// Get notified about a new selection and retrieve new data and show it
					async function getSelections() {
						currentSelections = '';
						if (layout.commentLevel == 'aus' || layout.commentLevel == 'as') {
							currentSelections = await getCurrentSelections();
						}
						if (layout.commentLevel == 'auds' || layout.commentLevel == 'ads') {
							currentSelections = await createSelectionKey();
						}
						window['ref' + layout.qInfo.qId] = await createDbRefs(null);
						if (JSON.stringify(window['oldRef' + layout.qInfo.qId]) !== JSON.stringify(window['ref' + layout.qInfo.qId])) {
							window['oldRef' + layout.qInfo.qId] = window['ref' + layout.qInfo.qId];
							await clearContent();
							await createCommentView();
							getComments(currentSelections);
						}
					}

					// Call getSelections when new selection is made
					app.getList("SelectionObject", function () {
						getSelections();
					});

					// Function to get current selections within the app. A generic object is created to acheive this
					function getCurrentSelections() {
						return new Promise(function (resolve, reject) {
							app.createGenericObject({
								currentSelections: {
									qStringExpression: "=GetCurrentSelections('', '', '', 100)"
								}
							}, function (reply) {
								currentSelections = encodeURIComponent(reply.currentSelections);
								currentSelections = currentSelections.replace(/\./g, '%2E')
								console.log(currentSelections);
								resolve(currentSelections);
							});
						});
					}

					// Function to get the selections of particular dimensions (only used when the comment level is using a selected dimension)
					function createSelectionKey() {
						return new Promise(async function (resolve, reject) {
							var dimensions = layout.qHyperCube.qDimensionInfo;
							var selectionKey = '';
							for (let dim of dimensions) {
								var fieldSelection = await getFieldSelections(dim.qGroupFieldDefs[0]);
								selectionKey += fieldSelection;
							}
							console.log(selectionKey);
							resolve(selectionKey);
						})

					}

					// Creating generic object which returns field selection
					function getFieldSelections(dim) {
						return new Promise(function (resolve, reject) {
							app.createGenericObject({
								fieldSelection: {
									qStringExpression: `=GetFieldSelections([${dim}],'', '',100)`
								}
							}, function (reply) {
								fieldSelection = encodeURIComponent(reply.fieldSelection);
								resolve(fieldSelection);
							});
						});
					}

					// Function to retrieve comments and show them in the table
					async function getComments(currentSelections) {

						// remove old listener
						if (window['oldCommentRef' + layout.qInfo.qId]) {
							window['oldCommentRef' + layout.qInfo.qId].off();
						}

						// Create new listener
						window['commentRef' + layout.qInfo.qId] = firebase.database().ref(window['ref' + layout.qInfo.qId].readRef);

						// Only turn new listener on if it is not the same as the previous listener
						if (window['oldCommentRef' + layout.qInfo.qId] !== window['commentRef' + layout.qInfo.qId]) {
							window['oldCommentRef' + layout.qInfo.qId] = window['commentRef' + layout.qInfo.qId];

							// Get comments from new ref
							window['commentRef' + layout.qInfo.qId].on('value', async function (snapshot) {
								// First emply table
								await clearContent();
								await createCommentView();

								// Get comments
								comments = await snapshot.val();

								// Loop through comments and append the table
								snapshot.forEach(function (node) {
									var date = new Date(node.val().time);
									var year = date.getFullYear();
									var month = date.getMonth() + 1;
									var day = date.getDate();
									var hours = date.getHours();
									var minutes = date.getMinutes();
									var finalDate = year + "-" + month + "-" + day + " " + hours + ":" + minutes;
									if (layout.commentView == 'dt') {
										$("#fireTable_" + layout.qInfo.qId).append(
											'<tr>' +
											'<td class="fireTdLeft_' + layout.qInfo.qId + '">' + node.val().user + '</td>' +
											'<td class="fireTd_' + layout.qInfo.qId + '">' + node.val().comment + '</td>' +
											'<td class="fireTd_' + layout.qInfo.qId + '"id=' + node.val().user + '_' + node.key + '>' + finalDate + '&nbsp&nbsp' + '</td>' +
											'</tr>');
									}
									else if (layout.commentView == 'st') {
										$("#fireTable_" + layout.qInfo.qId).append(
											'<tr>' +
											'<td class="fireTdLeft_' + layout.qInfo.qId + '" id=' + node.val().user + '_' + node.key + '>' + node.val().comment + '&nbsp&nbsp' + '</td>' +
											'</tr>');
									}

									else if (layout.commentView == 'stb') {
										$("#fireUl_" + layout.qInfo.qId).append('<li class="fireLi_' + layout.qInfo.qId + '" id=' + node.val().user + '_' + node.key + '>' + '&nbsp&nbsp' +
											node.val().comment + '</li><br>');
									}
									else if (layout.commentView == 'tfl') {
										switch (node.val().comment) {
											case 1:
												$(`#green_${layout.qInfo.qId}`).removeClass().addClass('green_' + layout.qInfo.qId);
												$(`#yellow_${layout.qInfo.qId}`).removeClass().addClass('none_' + layout.qInfo.qId);
												$(`#red_${layout.qInfo.qId}`).removeClass().addClass('none_' + layout.qInfo.qId);
												break;
											case 2:
												$(`#green_${layout.qInfo.qId}`).removeClass().addClass('none_' + layout.qInfo.qId);
												$(`#yellow_${layout.qInfo.qId}`).removeClass().addClass('yellow_' + layout.qInfo.qId);
												$(`#red_${layout.qInfo.qId}`).removeClass().addClass('none_' + layout.qInfo.qId);
												break;
											case 3:
												$(`#green_${layout.qInfo.qId}`).removeClass().addClass('none_' + layout.qInfo.qId);
												$(`#yellow_${layout.qInfo.qId}`).removeClass().addClass('none_' + layout.qInfo.qId);
												$(`#red_${layout.qInfo.qId}`).removeClass().addClass('red_' + layout.qInfo.qId);
												break;
											default:
												$(`#green_${layout.qInfo.qId}`).removeClass().addClass('none_' + layout.qInfo.qId);
												$(`#yellow_${layout.qInfo.qId}`).removeClass().addClass('none_' + layout.qInfo.qId);
												$(`#red_${layout.qInfo.qId}`).removeClass().addClass('none_' + layout.qInfo.qId);
										}
									}
									$('#' + node.val().user + '_' + node.key).append('<span class="lui-icon lui-icon--bin" aria-hidden="true" style="display: none;"></span>');



									if (node.val().user == currentUser && editMode == 1) {
										$('#' + node.val().user + '_' + node.key).find('.lui-icon.lui-icon--bin').show();
										// On click delete icon callback
										$(".lui-icon.lui-icon--bin").click(function () {
											var ts = $(this)[0].parentElement.id;
											var tsSplit = ts.split('_');
											var id = tsSplit[2];
											deleteComments(id);
										})
									}
								})
							});
						}

					}

					// Delete comments
					async function deleteComments(id) {
						ref = await createDbRefs(id);
						firebase.database().ref(ref.deleteRef).remove();
					}

					// Function to clear contents of table/textbox
					function clearContent() {
						return new Promise(function(resolve, reject){
							resolve($('#fireContent_' + layout.qInfo.qId).empty());
						})
					}

					// Function to create table header
					function createCommentView() {
						if (layout.commentView == 'dt') {
							$('#fireContent_' + layout.qInfo.qId).append('<table id="fireTable_' + layout.qInfo.qId + '" class="fire-table_' + layout.qInfo.qId + '"><tr><th class="fireThLeft_' + layout.qInfo.qId + '">User</th><th class="fireTh_' + layout.qInfo.qId + '">Comments</th><th class="fireTh_' + layout.qInfo.qId + '">Time</th></tr></table>');
						}
						else if (layout.commentView == 'st') {
							$('#fireContent_' + layout.qInfo.qId).append('<table id="fireTable_' + layout.qInfo.qId + '" class="fire-table_' + layout.qInfo.qId + '"><tr><th class="fireThLeft_' + layout.qInfo.qId + '">Comment</th></tr>');
						}
						else if (layout.commentView == 'stb') {
							$('#fireContent_' + layout.qInfo.qId).append('<p id="fireP_' + layout.qInfo.qId + '" class="fireP_' + layout.qInfo.qId + '"><ul id="fireUl_' + layout.qInfo.qId + '"></ul></p>');
						}
					}

					// Function to create a new comment
					async function writeNewComment(time, user, comment) {
						ref = await createDbRefs(null);
						firebase.database().ref(ref.createRef).set({
							time: time,
							user: user,
							comment: comment
						}, function (error) {
							if (error) {
							}
							else {
							}
						});
					}
				}

				// Function to create the correct database refs for Firebase based on comment level property in extension
				async function createDbRefs(id) {
					var ref = '';
					// Create current time field
					var time = await (new Date).getTime();
					currentSelections = await getCurrentSelections();
					currentDimensionSelections = await createSelectionKey();
					if (layout.commentLevel == 'aus') {
						ref = {
							"createRef": 'CommentsAUS/' + appId + '/' + layout.qInfo.qId + '/' + currentSelections + '/' + time,
							"readRef": 'CommentsAUS/' + appId + '/' + layout.qInfo.qId + '/' + currentSelections,
							"deleteRef": 'CommentsAUS/' + appId + '/' + layout.qInfo.qId + '/' + currentSelections + '/' + id
						}
					}
					if (layout.commentLevel == 'auds') {
						ref = {
							"createRef": 'CommentsAUS/' + appId + '/' + layout.qInfo.qId + '/' + currentDimensionSelections + '/' + time,
							"readRef": 'CommentsAUS/' + appId + '/' + layout.qInfo.qId + '/' + currentDimensionSelections,
							"deleteRef": 'CommentsAUS/' + appId + '/' + layout.qInfo.qId + '/' + currentDimensionSelections + '/' + id
						}
					}
					if (layout.commentLevel == 'as') {
						ref = {
							"createRef": 'CommentsAS/' + appId + '/' + layout.qInfo.qId + '/' + currentSelections + '/comment',
							"readRef": 'CommentsAS/' + appId + '/' + layout.qInfo.qId + '/' + currentSelections,
							"deleteRef": 'CommentsAS/' + appId + '/' + layout.qInfo.qId + '/' + currentSelections + '/comment'
						}
					}
					if (layout.commentLevel == 'ads') {
						ref = {
							"createRef": 'CommentsAS/' + appId + '/' + layout.qInfo.qId + '/' + currentDimensionSelections + '/comment',
							"readRef": 'CommentsAS/' + appId + '/' + layout.qInfo.qId + '/' + currentDimensionSelections,
							"deleteRef": 'CommentsAS/' + appId + '/' + layout.qInfo.qId + '/' + currentDimensionSelections + '/comment'
						}
					}
					if (layout.commentLevel == 'a') {

						ref = {
							"createRef": 'CommentsA/' + appId + '/' + layout.qInfo.qId + '/' + '/comment',
							"readRef": 'CommentsA/' + appId + '/' + layout.qInfo.qId,
							"deleteRef": 'CommentsA/' + appId + '/' + layout.qInfo.qId + '/' + '/comment'
						}
					}
					if (layout.commentLevel == 'au') {
						ref = {
							"createRef": 'CommentsAU/' + appId + '/' + layout.qInfo.qId + '/' + time,
							"readRef": 'CommentsAU/' + appId + '/' + layout.qInfo.qId,
							"deleteRef": 'CommentsAU/' + appId + '/' + layout.qInfo.qId + '/' + id
						}
					}
					return ref;
				}

				//needed for export
				return qlik.Promise.resolve();

			}
		};
	});


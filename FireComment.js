var prefix = window.location.pathname.substr(0, window.location.pathname.toLowerCase().lastIndexOf("/extensions") + 1);
var config = {
	host: window.location.hostname,
	prefix: prefix,
	port: window.location.port,
	isSecure: window.location.protocol === "https:"
};
var currentUser;
var oldCommentRef;
var oldFontSize;
var oldCommentView = null;
var oldCommentLevel = null;
var initFirebase;
var rendered;
var editMode = 0;
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
	'text!./leonardo-ui.css',
	'text!./fireComment.css',
	'./config',
	'./leonardo-ui',
	'./properties'
],
	function (qlik, $, firebase, html, leoCss, fireCss, configFile, leoJs, prop) {

		return {
			definition: prop,
			support: {
				snapshot: false,
				export: false,
				exportData: false
			},
			paint: async function ($element, layout) {
				if (!rendered) {
					rendered = true;

				}
				else {
					// Change CSS when font size is changed in prop
					if (layout.fontSize != oldFontSize) {
						$('#fireCss').remove();
						css = fireCss.replace(/fontVariable/g, layout.fontSize);
						$('<style id="fireCss">').html(css).appendTo("head");
						oldFontSize = layout.fontSize;
					}
				}

				var fireIconPanel = $('#fireIconPanel');
				if (!fireIconPanel.length) {

					// Add custom CSS
					css = fireCss.replace(/fontVariable/g, layout.fontSize);
					$('<style id="fireCss">').html(css).appendTo("head");
					$element.append(html);
					oldFontSize = layout.fontSize;

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
							console.log(errorCode, errorMessage);
						});
					}

					// On click plus icon
					$('#addButton').click(function () {
						$('#editButton').hide();
						$('#fireTextArea').val('');
						$('#fireContainer').show();
						$('#addButton').hide();
						$('#fireContent').hide();
					});


					// On click edit icon
					$('#editButton').click(function () {
						editMode = 1;
						$('#editButton').hide();
						$('#addButton').hide();
						$('#closeButton').show();
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
					$('#closeButton').click(function () {
						editMode = 0;
						$('#editButton').show();
						$('#addButton').show();
						$('#closeButton').hide();
						$(".lui-icon.lui-icon--bin").hide();
					});

					// On click cancel button
					$('#cancelButton').click(function () {
						$('#editButton').show();
						$('#fireContainer').hide();
						$('#addButton').show();
						$('#fireContent').show();
					});

					// On click save button write to DB
					$('#saveButton').click(async function () {
						currentSelections = await getCurrentSelections();
						milliseconds = await (new Date).getTime();
						console.log(milliseconds);
						comments = await writeNewComment(milliseconds, currentUser, $('#fireTextArea').val());
						$('#fireContainer').hide();
						$('#addButton').show();
						$('#fireContent').show();
						$('#editButton').show();
					});

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
						ref = await createDbRefs(null);
						if (JSON.stringify(oldRef) !== JSON.stringify(ref)) {
							oldRef = ref;
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
							resolve(selectionKey);
						})

					}

					// Creating generic object which returns field selection
					function getFieldSelections(dim) {
						return new Promise(function (resolve, reject) {
							app.createGenericObject({
								fieldSelection: {
									qStringExpression: "=GetFieldSelections(" + dim + ", '',100)"
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
						if (oldCommentRef) {
							oldCommentRef.off();
						}

						// Create new listener
						var commentRef = firebase.database().ref(ref.readRef);

						// Only turn new listener on if it is not the same as the previous listener
						if (oldCommentRef !== commentRef) {
							oldCommentRef = commentRef;

							// Get comments from new ref
							commentRef.on('value', async function (snapshot) {
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
										$("#fireTable" + layout.qInfo.qId).append(
											'<tr>' +
											'<td class="fireTdLeft">' + node.val().user + '</td>' +
											'<td class="fireTd">' + node.val().comment + '</td>' +
											'<td class="fireTd"id=' + node.val().user + '_' + node.key + '>' + finalDate + '&nbsp&nbsp' + '</td>' +
											'</tr>');
									}
									else if (layout.commentView == 'st') {
										$("#fireTable" + layout.qInfo.qId).append(
											'<tr>' +
											'<td class="fireTdLeft" id=' + node.val().user + '_' + node.key + '>' + node.val().comment + '&nbsp&nbsp' + '</td>' +
											'</tr>');
									}

									else if (layout.commentView == 'stb') {
										$("#fireUl" + layout.qInfo.qId).append('<li class="fireLi" id=' + node.val().user + '_' + node.key + '>' + '&nbsp&nbsp' +
											node.val().comment + '</li><br>');
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
						$('#fireContent').empty();
					}

					// Function to create table header
					function createCommentView() {
						if (layout.commentView == 'dt') {
							$('#fireContent').append('<table id="fireTable'+ layout.qInfo.qId + '" class="fire-table"><tr><th class="fireThLeft">User</th><th class="fireTh">Comments</th><th class="fireTh">Time</th></tr></table>');
						}
						else if (layout.commentView == 'st') {
							$('#fireContent').append('<table id="fireTable'+ layout.qInfo.qId + '" class="fire-table"><tr><th class="fireThLeft">Comment</th></tr>');
						}

						else if (layout.commentView == 'dtb') {
							$('#fireContent').append('<p id="fireP'+ layout.qInfo.qId + '" class="fireP"></p>');
						}
						else if (layout.commentView == 'stb') {
							$('#fireContent').append('<p id="fireP'+ layout.qInfo.qId + '" class="fireP"><ul id="fireUl'+ layout.qInfo.qId + '"></ul></p>');
						}
					}

					// Function to create a new comment
					async function writeNewComment(time, user, comment) {
						ref = await createDbRefs();
						firebase.database().ref(ref.createRef).set({
							time: time,
							user: user,
							comment: comment
						}, function (error) {
							if (error) {
								console.log(error);
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

					if (layout.commentLevel == 'aus' || layout.commentLevel == 'auds') {
						ref = {
							"createRef": 'CommentsAUS/' + appId + '/' + currentSelections + '/' + time,
							"readRef": 'CommentsAUS/' + appId + '/' + currentSelections,
							"deleteRef": 'CommentsAUS/' + appId + '/' + currentSelections + '/' + id
						}
					}
					if (layout.commentLevel == 'as' || layout.commentLevel == 'ads') {
						ref = {
							"createRef": 'CommentsAS/' + appId + '/' + currentSelections + '/comment',
							"readRef": 'CommentsAS/' + appId + '/' + currentSelections,
							"deleteRef": 'CommentsAS/' + appId + '/' + currentSelections + '/comment'
						}
					}
					if (layout.commentLevel == 'a') {
						ref = {
							"createRef": 'CommentsA/' + appId + '/comment',
							"readRef": 'CommentsA/' + appId,
							"deleteRef": 'CommentsA/' + appId + '/comment'
						}
					}
					if (layout.commentLevel == 'au') {
						ref = {
							"createRef": 'CommentsAU/' + appId + time,
							"readRef": 'CommentsAU/' + appId,
							"deleteRef": 'CommentsAU/' + appId + id
						}
					}
					return ref;
				}

				//needed for export
				return qlik.Promise.resolve();

			}
		};

	});


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
var oldCommentView;
var initFirebase;
var rendered;

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
				console.log('paint');

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
					console.log('does not exist');

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
						currentUser = currentUser.replace('; UserId=', '/');
					});

					// Init firebase
					if (!initFirebase) {
						firebase = await firebase.initializeApp(config);
						initFirebase = true;
					}

					// On click plus icon
					$('#addButton').click(function () {
						$('#fireTextArea').val('');
						$('#fireContainer').show();
						$('#addButton').hide();
						$('#fireContent').hide();
					});

					// On click cancel button
					$('#cancelButton').click(function () {
						$('#fireContainer').hide();
						$('#addButton').show();
						$('#fireContent').show();
					});

					// On click save button write to DB
					$('#saveButton').click(async function () {
						currentSelections = await getCurrentSelections();
						milliseconds = await (new Date).getTime();
						comments = await writeNewComment('Comments/' + appId + '/' + currentSelections + '/' + milliseconds, milliseconds, currentUser, $('#fireTextArea').val());
						$('#fireContainer').hide();
						$('#addButton').show();
						$('#fireContent').show();
					});

					// Get current app and appid
					var app = qlik.currApp(this);
					var appId = app.id;

					// Get notified about a new selection and retrieve new data and show it
					async function getSelections() {
						currentSelections = await getCurrentSelections();
						await clearContent();
						await createCommentView();
						getComments(currentSelections);
					}

					// Call getSelectionsAndData when new selection is made
					app.getList("SelectionObject", function () {
						getSelections();
					});

					// Function to get current selections. A generic object is created to acheive this
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

					// Function to retrieve comments and show them in the table
					function getComments(currentSelections) {

						// remove old listener
						if (oldCommentRef) {
							oldCommentRef.off();
						}

						// Create new listener
						var commentRef = firebase.database().ref('Comments/' + appId + '/' + currentSelections);
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
								console.log('node', node);
								var date = new Date(node.val().time);
								var year = date.getFullYear();
								var month = date.getMonth() + 1;
								var day = date.getDate();
								var hours = date.getHours();
								var minutes = date.getMinutes();
								var seconds = date.getSeconds();
								var finalDate = year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;

								if (layout.commentView == 'dt') {
									$('#fireTable').append(
										'<tr><td class="fireTdLeft">' + node.val().user + '</td>' +
										'<td class="fireTd">' + node.val().comment + '</td>' +
										'<td class="fireTd">' + finalDate + '</td></tr>');
								}
								else if (layout.commentView == 'st') {
									$('#fireTable').append(
										'<tr><td class="fireTdLeft">' + node.val().comment + '</td></tr>');
								}
								else if (layout.commentView == 'dtb') {
									$('#fireP').append(node.val().user + '&nbsp;&nbsp;&nbsp;&nbsp;' + node.val().comment + '&nbsp;&nbsp;&nbsp;&nbsp;' + finalDate + '<br><br>');
								}
								else if (layout.commentView == 'stb') {
									$('#fireUl').append('<li class="fireLi">' + node.val().comment + '</li><br>');
								}
							})
						});
					}

					// Function to clear contents of table/textbox
					function clearContent() {
						$('#fireContent').empty();
					}

					function createCommentView() {
						if (layout.commentView == 'dt') {
							$('#fireContent').append('<table id="fireTable" class="fire-table"><tr><th class="fireThLeft">User</th><th class="fireTh">Comments</th><th class="fireTh">Time</th></tr></table>');
						}
						else if (layout.commentView == 'st') {
							$('#fireContent').append('<table id="fireTable" class="fire-table"><tr><th class="fireThLeft">Comment</th></tr>');
						}

						else if (layout.commentView == 'dtb') {
							$('#fireContent').append('<p id="fireP" class="fireP"></p>');
						}
						else if (layout.commentView == 'stb') {
							$('#fireContent').append('<p id="fireP" class="fireP"><ul id="fireUl"></ul></p>');
						}
					}

					// Function to create a new comment
					function writeNewComment(ref, time, user, comment) {
						firebase.database().ref(ref).set({
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

				//needed for export
				return qlik.Promise.resolve();
			}
		};

	});


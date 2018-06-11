# FireComment
A simple Qlik Sense extension which enables commenting by using a Firebase Realtime Database as a back end

# Setup Instructions
1. First you will need to get the appropriate firebase project details. Please follow the instructions in the link below to create a new firebase project and receive your config details: https://firebase.google.com/docs/web/setup The details you will need to copy look like this 

` 
var config = {
    apiKey: "<API_KEY>",
    authDomain: "<PROJECT_ID>.firebaseapp.com",
    databaseURL: "https://<DATABASE_NAME>.firebaseio.com",
    projectId: "<PROJECT_ID>",
    storageBucket: "<BUCKET>.appspot.com",
    messagingSenderId: "<SENDER_ID>",
  };
  `
2. Download the FireComment extension here: https://github.com/rileymd88/FireComment/archive/master.zip
3. Unzip the extension and update the config.js file with the details from step 1
4. Zip the extension again and then upload it into the QMC

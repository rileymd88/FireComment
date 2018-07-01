# FireComment
![Image of Logo](https://github.com/rileymd88/FireComment/blob/master/FireComment.png)

A simple Qlik Sense extension which enables commenting by using a Firebase Realtime Database as a back end

**Disclaimer:** This project has been started by me in a personal capacity and is not supported by Qlik.

![Alt Text](https://github.com/rileymd88/FireComment/blob/master/FireComment.gif)

# Feature Overview
* Only need to import the extension (no need to run a new background service/db)
* All comments are displayed in real time (no need to refresh the extension)
* All comments are saved and displayed in real time based on the selection within the app
* Ability to delete comments
* Ability to change font size and comment view types

# Setup Instructions
1. First you will need to get the appropriate firebase project details. Please follow the instructions in the link below to create a new firebase project and receive your config details: https://firebase.google.com/docs/web/setup The details you will need to copy look like this:

```
var config = {
    apiKey: "<API_KEY>",
    authDomain: "<PROJECT_ID>.firebaseapp.com",
    databaseURL: "https://<DATABASE_NAME>.firebaseio.com",
    projectId: "<PROJECT_ID>",
    storageBucket: "<BUCKET>.appspot.com",
    messagingSenderId: "<SENDER_ID>",
  };
 ```
2. Go to https://console.firebase.google.com/project/<YOUR_PROJECT_NAME>/database/YOUR_PROJECT_NAME/rules and edit the rules to the following:
```
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
 ```
3. Download the FireComment extension here: https://github.com/rileymd88/FireComment/archive/master.zip
4. Unzip the extension and update the config.js file with the details from step 1
5. Zip the extension again and then upload it into the QMC

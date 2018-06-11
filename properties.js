define([], function () {
    'use strict';
    var commentView = {
        ref: "commentView",
        label: "Comment View",
        type: "string",
        component: "dropdown",
        options: [{
            value: "dt",
            label: "Detailed Table"
        }, {
            value: "st",
            label: "Simple Table"
        },
        {
            value: "dtb",
            label: "Detailed Textbox"
        },
        {
            value: "stb",
            label: "Simple Textbox"
        }],
        defaultValue: "dt"
    };

    var commentLevel = {
        ref: "commentLevel",
        label: "Comment Level",
        type: "string",
        component: "dropdown",
        options: [{
            value: "aust",
            label: "App + User + Selection + Time"
        }, {
            value: "aus",
            label: "App + User + Selection"
        },
        {
            value: "as",
            label: "App + Selection"
        }],
        defaultValue: "aust"
    };

    var fontSize = {
        ref: "fontSize",
        label: "Font Size",
        type: "string",
        defaultValue: "12px"
    };
    var appearanceSection = {
        uses: "settings",
        items: {
            commentView: commentView,
            fontSize: fontSize
        }
    };
   /*  var dataSection = {
        component: "expandable-items",
        label: "Comment Data",
        items: {
            commentLevel: commentLevel
        }
    }; */
    return {
        type: "items",
        component: "accordion",
        items: {
            appearance: appearanceSection
            /* ,
            data: dataSection */
        }
    };
});
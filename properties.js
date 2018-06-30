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
            value: "aus",
            label: "App + User + Selection"
        }, {
            value: "as",
            label: "App + Selection"
        },
        {
            value: "a",
            label: "App"
        },
        {
            value: "au",
            label: "App + User"
        },
        {
            value: "auds",
            label: "App + User + Dimension Selection"
        },
        {
            value: "ads",
            label: "App + Dimension Selection"
        }
        ],
        defaultValue: "aus"
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
    var dataSection = {
        component: "expandable-items",
        label: "Comment Data",
        items: {
            commentLevel: commentLevel
        }
    };

    var dimensions = {
        uses: "dimensions",
        min: 0,
        max: 100
    };

    return {
        type: "items",
        component: "accordion",
        items: {
            dimensions: dimensions,
            appearance: appearanceSection,
            data: dataSection
        }
    };
});
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
        },
        {
            value: "tfl",
            label: "Traffic Light"
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
            label: "App + Time + Selection"
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
            label: "App + Time"
        },
        {
            value: "auds",
            label: "App + Time + Dimension Selection"
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
        expression: "optional",
        defaultValue: "12px",
        show: function (data) {
            return data.commentView !== 'tfl';
        }

    };
    var redColor = {
        ref: "redColor",
        label: "Red Color",
        type: "string",
        expression: "optional",
        defaultValue: "red",
        show: function (data) {
            return data.commentView == 'tfl';
        }
    };
    var amberColor = {
        ref: "amberColor",
        label: "Amber Color",
        type: "string",
        expression: "optional",
        defaultValue: "yellow",
        show: function (data) {
            return data.commentView == 'tfl';
        }
    };
    var greenColor = {
        ref: "greenColor",
        label: "Green Color",
        type: "string",
        expression: "optional",
        defaultValue: "green",
        show: function (data) {
            return data.commentView == 'tfl';
        }
    };
    var appearanceSection = {
        uses: "settings",
        items: {
            commentView: commentView,
            redColor: redColor,
            amberColor: amberColor,
            greenColor: greenColor,
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



// -------------------Code-------------------

function CameraTimeRemapping(thisObj) {

    // -------------------Global variables-------------------

    // About
    var name = "Camera Time Remapping";
    var version = "1.2";

    // Misc
    var alertMessage = [];
    var keyframeData = {};
    var cameraType;

    // -------------------UI-------------------

    function buildUI(thisObj) {

        // -------------------UI-------------------

        var myPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", name + " " + version, undefined, { resizeable: true });

        // UI elements
        res = "group\
            {\
                orientation:'column', alignment:['fill','center'], alignChildren:['fill','fill'],\
                textGroup: Group\
                {\
                    orientation:'column',\
                    staticText: StaticText{text: 'Camera Time Remapping'}\
                }\
                cameraGroup: Group\
                {\
                    orientation:'row', alignChildren:['fill','center'],\
                    copyCameraButton: Button{text: 'Copy'}\
                    pasterCameraButton: Button{text: 'Paste'}\
                }\
                settingsGroup: Group\
                {\
                    orientation:'row', alignment:['right','center'],\
                    dublicateButton: Button{text: 'D', maximumSize:[25,25]},\
                    precompButton: Button{text: 'P', maximumSize:[25,25]},\
                    bakeButton: Button{text: 'B', maximumSize:[25,25]},\
                    helpButton: Button{text: '?', maximumSize:[25,25]},\
                }\
            }";

        // Add UI elements to the panel
        myPanel.grp = myPanel.add(res);
        // Refresh the panel
        myPanel.layout.layout(true);
        // Set minimal panel size
        myPanel.grp.minimumSize = myPanel.grp.size;
        // Add panel resizing function 
        myPanel.layout.resize();
        myPanel.onResizing = myPanel.onResize = function () {
            this.layout.resize();
        }

        // -------------------Buttons-------------------

        myPanel.grp.cameraGroup.copyCameraButton.onClick = function () {
            copyCamera();
        }

        myPanel.grp.cameraGroup.pasterCameraButton.onClick = function () {
            pasteCamera();
        }

        myPanel.grp.settingsGroup.dublicateButton.onClick = function () {
            dublicateWithLink();
        }

        myPanel.grp.settingsGroup.precompButton.onClick = function () {
            precompWithCamera();
        }

        myPanel.grp.settingsGroup.bakeButton.onClick = function () {
            bake();
        }

        myPanel.grp.settingsGroup.helpButton.onClick = function () {
            alertShow(
                "Author: youtube.com/@shy_rikki\n" +
                "Source: github.com/eirisocherry/camera-time-remapping\n" +
                "\n" +
                "[D] Duplicate with time-remap link\n" +
                "[P] Pre-comp with duplicated lights and baked cameras\n" +
                "[B] Bake expressions"
            );
        }

        return myPanel;
    }

    // -------------------Button functions-------------------

    function copyCamera() {

        // -------------------Checkers-------------------

        var comp = app.project.activeItem;

        if (!(comp instanceof CompItem)) {
            alert("Open a composition first.");
            return;
        }

        var selectedLayer;
        if (comp.selectedLayers.length === 0) {
            if (comp.activeCamera == null) {
                alert("No camera selected and no active camera found.");
                return;
            } else {
                selectedLayer = comp.activeCamera;
            }
        } else if (comp.selectedLayers.length === 1) {
            selectedLayer = comp.selectedLayers[0];
            if (!(selectedLayer instanceof CameraLayer)) {
                alert("Selected layer is not a camera.");
                return;
            }
        } else {
            alert("Select a single camera.");
            return;
        }

        // -------------------Copy-------------------

        selectedLayer.selected = true;
        copyKeyframes(selectedLayer);
        alert("Camera copied.");

    }

    function pasteCamera() {

        // -------------------Checkers-------------------

        var comp = app.project.activeItem;

        if (!(comp instanceof CompItem)) {
            alert("Open a composition first.");
            return;
        }

        var validLayers = [];
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            var layer = comp.selectedLayers[i];
            if (layer instanceof AVLayer && layer.timeRemapEnabled) {
                validLayers.push(layer);
            }
        }

        if (validLayers.length === 0) {
            alert("No valid layers with time-remapping enabled found.");
            return;
        }

        // -------------------Paste-------------------

        app.project.save();

        app.beginUndoGroup("Paste Camera");

        for (var j = 0; j < validLayers.length; j++) {

            var selectedLayer = validLayers[j];
            var newCamera = comp.layers.addCamera("Pasted Camera", [comp.width / 2, comp.height / 2]);
            if (cameraType === "One-Node Camera") {
                newCamera.autoOrient = AutoOrientType.NO_AUTO_ORIENT; // ONE-NODE
            }

            // Generate unique name for both selected layer and camera
            var selectedLayerName = selectedLayer.name;
            var newCameraName = selectedLayer.name + " [Camera]";
            var count = 1;
            while (true) {
                var selectedLayerExists = comp.layers.byName(selectedLayerName + (count > 1 ? " " + count : ""));
                var newCameraExists = comp.layers.byName(newCameraName + (count > 1 ? " " + count : ""));

                if ((selectedLayerExists && selectedLayerExists !== selectedLayer) ||
                    (newCameraExists && newCameraExists !== selectedLayer)) {
                    count++;
                } else {
                    break;
                }
            }
            selectedLayerName += (count > 1 ? " " + count : "");
            newCameraName += (count > 1 ? " " + count : "");
            selectedLayer.name = selectedLayerName;
            newCamera.name = newCameraName;

            // Trim and apply expression
            newCamera.moveAfter(selectedLayer);
            applyKeyframes(newCamera);
            newCamera.startTime = selectedLayer.inPoint;
            newCamera.outPoint = selectedLayer.outPoint;
            var camRemapExpression = 'valueAtTime(thisLayer.startTime + thisComp.layer("' + selectedLayerName + '").timeRemap);';
            if (cameraType !== "One-Node Camera") {
                newCamera.property("ADBE Transform Group").property("ADBE Anchor Point").expression = camRemapExpression;;
            }
            newCamera.transform.position.expression = camRemapExpression;
            newCamera.transform.orientation.expression = camRemapExpression;
            newCamera.transform.xRotation.expression = camRemapExpression;
            newCamera.transform.yRotation.expression = camRemapExpression;
            newCamera.transform.zRotation.expression = camRemapExpression;
            newCamera.property("ADBE Camera Options Group").property("ADBE Camera Zoom").expression = camRemapExpression;
        }

        app.endUndoGroup();

    }

    function dublicateWithLink() {

        // -------------------Checkers-------------------

        var comp = app.project.activeItem;

        if (!(comp instanceof CompItem)) {
            alert("Open a composition first.");
            return;
        }

        var validLayers = [];
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            var layer = comp.selectedLayers[i];
            if (layer instanceof AVLayer && layer.timeRemapEnabled) {
                validLayers.push(layer);
            }
        }

        if (validLayers.length === 0) {
            alert("No valid layers with time-remapping enabled found.");
            return;
        }

        // -------------------Dublicate-------------------

        app.project.save();

        app.beginUndoGroup("Duplicate");

        for (var j = 0; j < validLayers.length; j++) {

            var selectedLayer = validLayers[j];

            // Generate unique name
            var duplicatedName = selectedLayer.name + " [Duplicate]";
            var count = 1;
            while (true) {
                var duplicatedExists = comp.layers.byName(duplicatedName + (count > 1 ? " " + count : ""));
                if (duplicatedExists && duplicatedExists !== selectedLayer) {
                    count++;
                } else {
                    break;
                }
            }
            duplicatedName += (count > 1 ? " " + count : "");

            var duplicated = selectedLayer.duplicate();
            duplicated.name = duplicatedName;
            duplicated.moveAfter(selectedLayer);
            var selectedLayerName = selectedLayer.name;
            var linkExpression =
                'thisComp.layer("' + selectedLayerName + '").timeRemap;';
            duplicated.timeRemap.expression = linkExpression;

        }

        app.endUndoGroup();
    }

    function precompWithCamera() {

        // -------------------Checkers-------------------

        var comp = app.project.activeItem;

        if (!(comp instanceof CompItem)) {
            alert("Open a composition first.");
            return;
        }

        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            alert("Select layers you want to precomp. Selected lights and cameras will be duplicated.");
            return;
        }

        // -------------------Precomp-------------------

        app.beginUndoGroup("Precomp");

        // Dublicate cameras and lights
        for (var i = selectedLayers.length - 1; i >= 0; i--) {
            var layer = selectedLayers[i];
            if (layer instanceof CameraLayer || layer instanceof LightLayer) {
                var duplicateLayer = layer.duplicate();
                duplicateLayer.name = layer.name;
                layer.selected = false;
                duplicateLayer.selected = true;
                if (layer instanceof CameraLayer) {
                    convertExpressionsToKeyframes(duplicateLayer);
                }
            }
        }

        // Collect indexes
        selectedLayers = comp.selectedLayers;
        var layersToPrecompose = [];
        var minInPoint = selectedLayers[0].inPoint;
        var maxOutPoint = selectedLayers[0].outPoint;

        for (var i = 0; i < selectedLayers.length; i++) {
            layersToPrecompose.push(selectedLayers[i].index);
            if (selectedLayers[i].inPoint < minInPoint) {
                minInPoint = selectedLayers[i].inPoint;
            }
            if (selectedLayers[i].outPoint > maxOutPoint) {
                maxOutPoint = selectedLayers[i].outPoint;
            }
        }

        // Pre-comp
        var precompName = uniqueIndex(comp, "Pre-comp");
        var preComp = comp.layers.precompose(layersToPrecompose, precompName, true);

        // Shift pre-comped layers to start of comp
        for (var i = 1; i <= preComp.numLayers; i++) {
            preComp.layer(i).startTime -= minInPoint;
        }

        // Trim precomp and move it back
        var totalDuration = maxOutPoint - minInPoint;
        preComp.duration = totalDuration;
        var preCompLayer = comp.selectedLayers[0];
        preCompLayer.startTime = minInPoint;

        app.endUndoGroup();
    }

    function bake() {

        // -------------------Checkers-------------------

        var comp = app.project.activeItem;

        if (!(comp instanceof CompItem)) {
            alert("Open a composition first.");
            return;
        }

        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            alert("Select layers you want to bake expressions for.");
            return;
        }

        // -------------------Bake-------------------

        app.beginUndoGroup("Bake");

        for (var i = selectedLayers.length - 1; i >= 0; i--) {
            var layer = selectedLayers[i];
            if (hasExpressionErrors(layer)) {
                alertPush("Layer \"" + layer.name + "\" has expression errors. Fix them before baking.");
                if (alertMessage.length > 0) {
                    alertShow();
                };
                app.endUndoGroup();
                return;
            }
            convertExpressionsToKeyframes(layer);
        }

        app.endUndoGroup();
    }

    // -------------------Functions-------------------

    function uniqueIndex(comp, inputNames) {
        var isArray = inputNames && typeof inputNames.length === 'number' && typeof inputNames !== 'string';
        if (!isArray) {
            inputNames = [inputNames];
        }

        var uniqueNames = inputNames.slice();
        var index = 1;
        var nameExists;
        var result = {};

        do {
            nameExists = false;
            for (var i = 0; i < uniqueNames.length; i++) {
                var currentName = uniqueNames[i] + (index > 1 ? " " + index : "");
                if (comp.layers.byName(currentName)) {
                    nameExists = true;
                    break;
                }
            }
            if (nameExists) {
                index++;
            }
        } while (nameExists);

        for (var i = 0; i < uniqueNames.length; i++) {
            var finalName = uniqueNames[i] + (index > 1 ? " " + index : "");
            result[uniqueNames[i]] = finalName;
        }

        return isArray ? result : result[inputNames[0]];
    }

    function copyKeyframes(layer) {

        cameraType = layer.autoOrient === AutoOrientType.NO_AUTO_ORIENT ? "One-Node Camera" : "Two-Node Camera";
        keyframeData = {};

        if (cameraType === "One-Node Camera") {
            var propertiesToShift = [
                layer.transform.position,
                layer.transform.orientation,
                layer.transform.xRotation,
                layer.transform.yRotation,
                layer.transform.zRotation,
                layer.property("ADBE Camera Options Group").property("ADBE Camera Zoom")
            ];
        } else {
            var propertiesToShift = [
                layer.property("ADBE Transform Group").property("ADBE Anchor Point"),
                layer.transform.position,
                layer.transform.orientation,
                layer.transform.xRotation,
                layer.transform.yRotation,
                layer.transform.zRotation,
                layer.property("ADBE Camera Options Group").property("ADBE Camera Zoom"),
            ];
        }

        for (var i = 0; i < propertiesToShift.length; i++) {
            var property = propertiesToShift[i];
            //$.writeln(property.name + ": " + property.numKeys + " keyframes");
            if (property && property.numKeys > 0) {
                var keyTimes = [];
                var keyValues = [];
                for (var j = 1; j <= property.numKeys; j++) {
                    keyTimes.push(property.keyTime(j));
                    keyValues.push(property.keyValue(j));
                }
                keyframeData[property.name] = {
                    times: keyTimes,
                    values: keyValues
                };
            } else if (property) {
                var keyTimes = [];
                var keyValues = [];
                keyTimes.push(layer.inPoint);
                keyValues.push(property.value);
                keyframeData[property.name] = {
                    times: keyTimes,
                    values: keyValues
                };
            }
        }
    }

    function applyKeyframes(layer) {
        for (var propertyName in keyframeData) {
            if (keyframeData.hasOwnProperty(propertyName)) {
                var property = layer.property(propertyName);
                if (property) {
                    var data = keyframeData[propertyName];
                    property.setValuesAtTimes(data.times, data.values);
                    for (var i = 1; i <= property.numKeys; i++) {
                        property.setInterpolationTypeAtKey(i, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
                    }
                }
            }
        }
    }

    function convertExpressionsToKeyframes(propertyGroup) {
        for (var j = 1; j <= propertyGroup.numProperties; j++) {
            var property = propertyGroup.property(j);
            if (property instanceof PropertyGroup) {
                convertExpressionsToKeyframes(property);
            } else if (property.expressionEnabled) {
                property.selected = true;
                app.executeCommand(2639); // convert expression to keyframes
                property.selected = false;
                // Set hold keyframes for all keys
                for (var k = 1; k <= property.numKeys; k++) {
                    property.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
                }
            }
        }
    }

    function hasExpressionErrors(propertyGroup) {
        for (var j = 1; j <= propertyGroup.numProperties; j++) {
            var property = propertyGroup.property(j);
            if (property instanceof PropertyGroup) {
                if (hasExpressionErrors(property)) {
                    return true;
                }
            } else if (property.expressionEnabled && property.expressionError) {
                return true;
            }
        }
        return false;
    }

    function alertPush(message) {
        alertMessage.push(message);
    }

    function alertShow(message) {

        alertMessage.push(message);

        if (alertMessage.length === 0) {
            return;
        }

        var allMessages = alertMessage.join("\n\n")

        var dialog = new Window("dialog", "Information");
        var textGroup = dialog.add("group");
        textGroup.orientation = "column";
        textGroup.alignment = ["fill", "top"];

        var text = textGroup.add("edittext", undefined, allMessages, { multiline: true, readonly: true });
        text.alignment = ["fill", "fill"];
        text.preferredSize.width = 300;
        text.preferredSize.height = 300;

        var closeButton = textGroup.add("button", undefined, "Close");
        closeButton.onClick = function () {
            dialog.close();
        };

        dialog.show();

        alertMessage = [];

    }

    // -------------------Show UI-------------------

    var myScriptPal = buildUI(thisObj);
    if ((myScriptPal != null) && (myScriptPal instanceof Window)) {
        myScriptPal.center();
        myScriptPal.show();
    }
    if (this instanceof Panel)
        myScriptPal.show();
}
CameraTimeRemapping(this);

// --------------------------------------

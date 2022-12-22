let templateSize = 0; //save globally

let useCORS = true; // flag to activate loading of external images via CORS helper function -> otherwise canvas is tainted and download button not working
//const CORS_ANYWHERE_BASE_URL = 'https://dominion-card-generator-cors.herokuapp.com/';
//const CORS_ANYWHERE_BASE_URL = 'https://thingproxy.freeboard.io/fetch/';
const CORS_ANYWHERE_BASE_URL = 'https://proxy.cors.sh/'; // from https://blog.grida.co/cors-anywhere-for-everyone-free-reliable-cors-proxy-service-73507192714e

Array.prototype.remove = function () {
    var what, a = arguments,
        L = a.length,
        ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

function copy(x) {
    return JSON.parse(JSON.stringify(x));
}

// Initialization of complete logic on load of page
function initCardImageGenerator() {

    //these three can all be expanded as you see fit
    var icons = { //the names should match the image filenames (plus a .png extension).
        "@": ["Debt", "white", "Treasure"],
        "\\^": ["Potion", "white", "Treasure"],
        "%": ["VP", "white", "Victory"],
        "#": ["VP-Token", "white", "Victory"], //German VP Token (not a nice decision of ASS Altenburger, but maybe nice to have to keep the cards consistent)
        "\\$": ["Coin", "black", "Treasure"],
        "§": ["Custom Icon", "white", "Treasure"]
    };
    var normalColorFactorLists = [
		["Action/Event", [1, 1, 1]],
		["Treasure", [1.1, 0.95, 0.55]],
		["Victory", [0.75, 0.9, 0.65]],
		["Reaction", [0.65, 0.8, 1.05]],
		["Duration", [1.2, 0.8, 0.4]],
		["Reserve", [0.9, 0.75, 0.5]],
		["Curse", [0.85, 0.6, 1.1]],
		["Shelter", [1.05, 0.65, 0.5]],
		["Ruins", [0.75, 0.6, 0.35]],
		["Landmark", [0.45, 1.25, 0.85]],
		["Night", [0.3, 0.4, 0.45]],
		["Boon", [1.4, 1.35, 0.55, 0, 0, 0, 1.7, 1.25, 0.65, 1.95, 1.6, 0.4]],
		["Hex", [0.75, 0.6, 2.1, 0, 0, 0, 0.8, 0.8, 0.8, 1.0, 0.75, 2.1]],
		["State", [1.1, 1.3, 1.3, 0.6, 0.15, 0, 1.55, 1.15, 1.05, 1.4, 0.65, 0.45]],
		["Artifact", [1.15, 1, 0.75, 0.3, 0.15, 0.05]],
		["Project", [1.15, 0.95, 0.9, 0.4, 0.2, 0.15]],
		["Way", [1, 1.15, 1.25, 0.25, 0.3, 0.35, 1.6, 1.6, 1.6, 1.3, 1.3, 1.3]],
		["Ally", [1, 0.95, 0.85, 0.35, 0.3, 0.15, 0.9, 0.8, 0.7, 0.9, 0.8, 0.7]],
		["Trait", [0.95, 0.8, 1.1, 0.3, 0.25, 0.35, 1.6, 1.6, 1.6, 1.3, 1.3, 1.3]]
	];
    var boldableKeywords = [ //case-insensitive
		"card",
		"buy",
		"action",
		"coffer",
		"villager",

		"aktion",
        "aktionen",
        "karte",
        "karten",
        "kauf",
        "käufe",
        "dorfbewohner",
        "münze",
        "münzen"
	];
    var specialBoldableKeywords = [
        "favor",
        "gefallen"
	];
    var travellerTypesPattern = new RegExp(["Traveller", "Traveler", "Reisender", "Reisende", "Reiziger", "Matkaaja", "Itinérant", "Путешественник", "Приключенец"].join("|"));


    var normalColorCustomIndices = [0, 0];
    var normalColorDropdowns = document.getElementsByName("normalcolor");
    for (var j = 0; j < normalColorDropdowns.length; ++j) {
        for (var i = 0; i < normalColorFactorLists.length; ++i) { //"- j" because only the first dropdown should have Night
            var option = document.createElement("option");
            option.textContent = normalColorFactorLists[i][0];
            normalColorDropdowns[j].appendChild(option);
        }
        normalColorCustomIndices[j] = normalColorDropdowns[j].childElementCount;
        var customOption = document.createElement("option");
        customOption.textContent = "CUSTOM";
        normalColorDropdowns[j].appendChild(customOption);
        customOption = document.createElement("option");
        customOption.textContent = "EXTRA CUSTOM";
        normalColorDropdowns[j].appendChild(customOption);
        normalColorDropdowns[j].selectedIndex = 0;
    }
    //var templateSize = 0;

    function rebuildBoldLinePatternWords() {
        let elemBoldkeys = document.getElementById("boldkeys");
        let customBoldableKeywords = elemBoldkeys !== null ? elemBoldkeys.value : "";
        let boldableKeywordsFull = customBoldableKeywords.length > 0 ? boldableKeywords.concat(customBoldableKeywords.split(";")) : boldableKeywords;
        boldableKeywordsFull.forEach(function (word, index) {
            this[index] = word.trim();
        }, boldableKeywordsFull);
        boldLinePatternWords = RegExp("(?:([-+]\\d+)\\s+|(\\+))(" + boldableKeywordsFull.join("|") + "s?)", "ig");
        boldLinePatternWordsSpecial = RegExp("(?:([-+]\\d+)\\s+|(?:(\\d+)\\s+)|(\\+)|)(" + specialBoldableKeywords.join("|") + "s?)", "ig");
    }
    var boldLinePatternWords;
    var boldLinePatternWordsSpecial;
    rebuildBoldLinePatternWords();

    var iconList = "[" + Object.keys(icons).join("") + "]";
    //var boldLinePatternIcons = RegExp("[-+]\\d+\\s" + iconList + "\\d+", "ig");
    var iconWithNumbersPattern = "[-+]?(" + iconList + ")([\\d\\?]*[-+\\*]?)";
    var iconWithNumbersPatternSingle = RegExp("^([-+]?\\d+)?" + iconWithNumbersPattern + "(\\S*)$");
    iconWithNumbersPattern = RegExp(iconWithNumbersPattern, "g");

    var canvases = document.getElementsByClassName("myCanvas");

    var images = [];
    var imagesLoaded = false;
    var recolorFactorList = [
		[0.75, 1.1, 1.35, 0, 0, 0, 1, 2, 3, 4, 5, 6],
		[0.75, 1.1, 1.35, 0, 0, 0, 1, 2, 3, 4, 5, 6]
	];

    var normalColorCurrentIndices = [0, 0];
    var recoloredImages = [];

    function draw() {

        function getRecoloredImage(imageID, colorID, offset) {
            if (!recoloredImages[imageID]) { //http://stackoverflow.com/questions/1445862/possible-to-use-html-images-like-canvas-with-getimagedata-putimagedata
                var cnvs = document.createElement("canvas");
                var w = images[imageID].width,
                    h = images[imageID].height;
                cnvs.width = w;
                cnvs.height = h;
                var ctx = cnvs.getContext("2d");
                ctx.drawImage(images[imageID], 0, 0);

                var imgdata = ctx.getImageData(0, 0, w, h);
                var rgba = imgdata.data;

                offset = offset || 0;
                var recolorFactors;
                if (normalColorCurrentIndices[colorID] === normalColorCustomIndices[colorID])
                    recolorFactors = recolorFactorList[colorID].slice(0, 3);
                else if (normalColorCurrentIndices[colorID] > normalColorCustomIndices[colorID])
                    recolorFactors = recolorFactorList[colorID];
                else
                    recolorFactors = normalColorFactorLists[normalColorCurrentIndices[colorID] - colorID][1];
                recolorFactors = recolorFactors.slice();

                while (recolorFactors.length < 6)
                    recolorFactors.push(0);

                if (offset == 0) {
                    for (var ch = 0; ch < 3; ++ch)
                        recolorFactors[ch] -= recolorFactors[ch + 3];
                    for (var px = 0, ct = w * h * 4; px < ct; px += 4)
                        if (rgba[px + 3]) //no need to recolor pixels that are fully transparent
                            for (var ch = 0; ch < 3; ++ch)
                                rgba[px + ch] = Math.max(0, Math.min(255, Math.round(recolorFactors[ch + 3] * 255 + rgba[px + ch] * recolorFactors[ch])));
                } else {
                    while (recolorFactors.length < 12)
                        recolorFactors.push(genericCustomAccentColors[templateSize & 1][recolorFactors.length]);
                    for (var px = 0, ct = w * h * 4; px < ct; px += 4)
                        if (rgba[px + 3])
                            for (var ch = 0; ch < 3; ++ch)
                                rgba[px + ch] = Math.max(0, Math.min(255, rgba[px + ch] * recolorFactors[ch + offset]));
                }

                ctx.putImageData(imgdata, 0, 0);
                recoloredImages[imageID] = cnvs;
            }
            return recoloredImages[imageID];
        }

        var iconReplacedWithSpaces = "     ";

        function getWidthOfLineWithIconsReplacedWithSpaces(line) {
            return context.measureText(line.replace(iconWithNumbersPattern, iconReplacedWithSpaces)).width;
        }

        function getIconListing(icon) {
            return icons[icon] || icons["\\" + icon];
        }
        var shadowDistance = 10;
        var italicSubstrings = ["[i]", "Heirloom: ", "Erbstück: ", "(This is not in the Supply.)", "Keep this until Clean-up."];

        function writeLineWithIconsReplacedWithSpaces(line, x, y, scale, family, boldSize) {
            boldSize = boldSize || 64;
            context.textAlign = "left";

            if (italicSubstrings.some(substring => line.includes(substring))) {
                context.font = "italic " + context.font;
                if (line.includes("[i]")) {
                    line = line.split("[i]").join("");
                    x += boldSize * scale;
                }
            } else {
                context.font = context.font.replace("italic ", "");
            }

            var words = line.split(" ");
            for (var i = 0; i < words.length; ++i) {
                var word = words[i];
                context.save();
                while (word) {
                    var match = word.match(iconWithNumbersPatternSingle);
                    if (match) {
                        var familyOriginal = family;
                        family = "mySpecials";
                        var localY = y;
                        var localScale = scale;
                        if (words.length === 1 && !word.startsWith('+')) {
                            localY += 115 - scale * 48;
                            context.font = "bold 192pt " + family;
                            localScale = 1.6;
                            if (templateSize === 3) {
                                context.font = "bold 222pt " + family;
                                if (word.includes('$')) { // Treasure Base cards
                                    localScale = localScale * 2;
                                } else {
                                    localScale = localScale * 1.5;
                                }
                            } else {
                                x = x + 48 * scale;
                            }
                        }
                        var halfWidthOfSpaces = context.measureText(iconReplacedWithSpaces).width / 2 + 2;

                        var image = false;
                        var iconKeys = Object.keys(icons);
                        for (var j = 0; j < iconKeys.length; ++j) {
                            if (iconKeys[j].replace("\\", "") == match[2]) {
                                image = images[numberFirstIcon + j];
                                break;
                            }
                        }

                        context.save();
                        if (!match[1] && (match[0].charAt(0) === '+' || match[0].charAt(0) === '-')) {
                            match[1] = match[0].charAt(0);
                        }
                        if (match[1]) {
                            if (context.font[0] !== "b")
                                context.font = "bold " + context.font;
                            context.fillText(match[1], x, localY);
                            x += context.measureText(match[1]).width + 10 * localScale;
                        }

                        x += halfWidthOfSpaces;

                        context.translate(x, localY);
                        context.scale(localScale, localScale);
                        if (image && image.height) { //exists
                            //context.shadowColor = "#000";
                            context.shadowBlur = 25;
                            context.shadowOffsetX = localScale * shadowDistance;
                            context.shadowOffsetY = localScale * shadowDistance;
                            context.drawImage(image, image.width / -2, image.height / -2);
                            context.shadowColor = "transparent";
                        } //else... well, that's pretty weird, but so it goes.
                        if (match[3]) { //text in front of image
                            context.textAlign = "center";
                            context.fillStyle = getIconListing(match[2])[1];
                            let cost = match[3];
                            let bigNumberScale = 1;
                            let nx = localScale > 1.4 ? 0 : -5 * localScale ^ 2;
                            let ny = localScale > 1 ? 6 * localScale : localScale > 0.7 ? 12 * localScale : localScale > 0.5 ? 24 * localScale : 48 * localScale;
                            if (localScale > 3) {
                                bigNumberScale = 0.8;
                                ny -= (115 * 0.2) / 2;
                            }
                            if (cost.length >= 2) {
                                // special handling for overpay and variable costs
                                let specialCost = cost.slice(-1);
                                let specialCostSize = 45;
                                let syShift = 0;
                                if (specialCost === '*') {
                                    //specialCost = '✱';
                                    specialCostSize = 65;
                                    syShift = 10;
                                    if (cost.length > 2) {
                                        bigNumberScale = 1.5 / (cost.length - 1);
                                    }
                                } else if (specialCost === '+') {
                                    specialCost = '✚';
                                    specialCostSize = 40;
                                    if (cost.length > 2) {
                                        bigNumberScale = 1.5 / (cost.length - 1);
                                    }
                                } else {
                                    specialCost = null;
                                    bigNumberScale = 1.5 / cost.length;
                                }
                                if (specialCost != null) {
                                    cost = cost.slice(0, -1) + " ";
                                    context.font = "bold " + specialCostSize + "pt " + family;
                                    let sx = localScale > 1 ? 45 / 2 * localScale : 45 * localScale;
                                    let sy = localScale > 1 ? -20 * localScale : 12 * localScale - 35 * localScale;
                                    if (cost.length >= 3) {
                                        nx -= specialCostSize * 1 / 3;
                                        sx += specialCostSize * 1 / 3;
                                    }
                                    sy += syShift * localScale;
                                    context.fillText(specialCost, sx, sy);
                                }
                            }
                            context.font = "bold " + 115 * bigNumberScale + "pt " + family;
                            context.fillText(cost, nx, ny);
                            //context.strokeText(match[3], 0, 0);
                        }
                        context.restore();
                        family = familyOriginal;

                        x += halfWidthOfSpaces;
                        word = match[4];
                    } else {
                        if (word.match(boldLinePatternWords) || word.match(boldLinePatternWordsSpecial)) {
                            if (words.length === 1)
                                context.font = "bold " + boldSize + "pt " + family;
                            else
                                context.font = "bold " + context.font;
                        }
                        if (context.font.includes('bold')) {
                            let lastChar = word.substr(word.length - 1);
                            if ([",", ";", ".", "?", "!", ":"].includes(lastChar)) {
                                word = word.slice(0, -1);
                            } else {
                                lastChar = "";
                            }
                            context.fillText(word, x, y);

                            if (lastChar != "") {
                                var x2 = context.measureText(word).width;
                                context.font = context.font.replace('bold ', '');
                                context.fillText(lastChar, x + x2, y);
                                context.font = "bold " + context.font;
                            }

                            word = word + lastChar;
                        } else {
                            context.fillText(word, x, y);
                        }

                        break; //don't start this again
                    }
                }
                x += context.measureText(word + " ").width;
                context.restore();
            }
        }

        function writeSingleLine(line, x, y, maxWidth, initialSize, family) {
            family = family || "myTitle";
            var size = (initialSize || 85) + 2;
            do {
                context.font = (size -= 2) + "pt " + family;
            } while (maxWidth && getWidthOfLineWithIconsReplacedWithSpaces(line) > maxWidth);
            writeLineWithIconsReplacedWithSpaces(line, x - getWidthOfLineWithIconsReplacedWithSpaces(line) / 2, y, size / 90, family);
        }

        function writeDescription(elementID, xCenter, yCenter, maxWidth, maxHeight, boldSize) {
            rebuildBoldLinePatternWords();
            var description = document.getElementById(elementID).value.replace(/ *\n */g, " \n ").replace(boldLinePatternWords, "$1\xa0$2$3").replace(boldLinePatternWordsSpecial, "$1$2\xa0$3$4") + " \n"; //separate newlines into their own words for easier processing
            var words = description.split(" ");
            var lines;
            var widthsPerLine;
            var heightsPerLine;
            var overallHeight;
            var size = 64 + 2;
            do { //figure out the best font size, and also decide in advance how wide and tall each individual line is
                widthsPerLine = [];
                heightsPerLine = [];
                overallHeight = 0;

                size -= 2;
                context.font = size + "pt myText";
                var widthOfSpace = context.measureText(" ").width;
                lines = [];
                var line = "";
                var progressiveWidth = 0;
                for (var i = 0; i < words.length; ++i) {
                    var word = words[i];
                    var heightToAdd = 0;
                    if (word === "\n") {
                        lines.push(line);
                        if (line === "") //multiple newlines in a row
                            heightToAdd = size * 0.5;
                        else if (line === "-") //horizontal bar
                            heightToAdd = size * 0.75;
                        else if ((line.match(boldLinePatternWords) || line.match(boldLinePatternWordsSpecial)) && line.indexOf(" ") < 0) { //important line
                            heightToAdd = boldSize * 1.433;
                            var properFont = context.font;
                            context.font = "bold " + boldSize + "pt myText"; //resizing up to 64
                            progressiveWidth = context.measureText(line).width; //=, not +=
                            context.font = properFont;
                        } else if (line.match(iconWithNumbersPatternSingle) && !line.startsWith('+')) {
                            heightToAdd = 275; //192 * 1.433
                            var properFont = context.font;
                            context.font = "bold 192pt myText";
                            progressiveWidth = getWidthOfLineWithIconsReplacedWithSpaces(line); //=, not +=
                            context.font = properFont;
                        } else //regular word
                            heightToAdd = size * 1.433;
                        line = ""; //start next line empty
                        widthsPerLine.push(progressiveWidth);
                        progressiveWidth = 0;
                    } else {
                        if (word.charAt(0) === "\xa0") {
                            word = word.substring(1);
                        }
                        if (progressiveWidth + getWidthOfLineWithIconsReplacedWithSpaces(" " + word) > maxWidth) {
                            lines.push(line + " ");
                            line = word;
                            heightToAdd = size * 1.433;
                            widthsPerLine.push(progressiveWidth);
                            progressiveWidth = getWidthOfLineWithIconsReplacedWithSpaces(word);
                        } else {
                            if (line.length) {
                                line += " ";
                                progressiveWidth += widthOfSpace;
                            }
                            line += word;
                            var properFont = context.font;
                            if (word.match(boldLinePatternWords) || word.match(boldLinePatternWordsSpecial)) //e.g. "+1 Action"
                                context.font = "bold " + properFont;
                            progressiveWidth += getWidthOfLineWithIconsReplacedWithSpaces(word);
                            context.font = properFont;
                            continue;
                        }
                    }
                    overallHeight += heightToAdd;
                    heightsPerLine.push(heightToAdd);
                }
                //overallHeight -= size*1.433;
            } while (overallHeight > maxHeight && size > 16); //can only shrink so far before giving up
            var y = yCenter - (overallHeight - size * 1.433) / 2;
            //var barHeight = size / 80 * 10;
            for (var i = 0; i < lines.length; ++i) {
                var line = lines[i];
                if (line === "-") //horizontal bar
                    context.fillRect(xCenter / 2, y - size * 0.375 - 5, xCenter, 10);
                else if (line.length)
                    writeLineWithIconsReplacedWithSpaces(line, xCenter - widthsPerLine[i] / 2, y, size / 96, "myText", boldSize);
                //else empty line with nothing to draw
                y += heightsPerLine[i];
            }
            context.fillStyle = "black";
        }

        function writeIllustrationCredit(x, y, color, bold, size = 31) {
            var illustrationCredit = document.getElementById("credit").value;
            if (illustrationCredit) {
                context.font = bold + size + "pt myText";
                context.fillStyle = color;
                context.fillText(illustrationCredit, x, y);
                context.fillStyle = "#000";
            }
        }

        function writeCreatorCredit(x, y, color, bold, size = 31) {
            var creatorCredit = document.getElementById("creator").value;
            if (creatorCredit) {
                context.textAlign = "right";
                context.font = bold + size + "pt myText";
                context.fillStyle = color;
                context.fillText(creatorCredit, x, y);
                context.fillStyle = "#000";
            }
        }

        if (!imagesLoaded) {
            imagesLoaded = (function () {
                for (var i = 0; i < images.length; ++i)
                    if (!images[i].complete) {
                        return false;
                    }
                return true;
            })();
            if (!imagesLoaded) {
                queueDraw();
                return;
            }
        } //else ready to draw!

        canvases[0].parentNode.setAttribute("data-status", "Redrawing...");

        // clear
        for (var i = 0; i < canvases.length; ++i)
            canvases[i].getContext("2d").clearRect(0, 0, canvases[i].width, canvases[i].height);

        var context;
        if (templateSize === 0 || templateSize === 2 || templateSize === 3) {
            context = canvases[0].getContext("2d");
        } else if (templateSize === 1 || templateSize === 4) {
            context = canvases[1].getContext("2d");
        } else {
            context = canvases[2].getContext("2d");
        }

        //context.save();

        // draw

        var picture = images[5];
        var pictureX = document.getElementById("picture-x").value;
        var pictureY = document.getElementById("picture-y").value;
        var pictureZoom = document.getElementById("picture-zoom").value;
        var expansion = images[17];
        var typeLine = document.getElementById("type").value;
        var heirloomLine = document.getElementById("type2").value;
        var previewLine = document.getElementById("preview").value;
        var priceLine = document.getElementById("price").value;
        var numberPriceIcons = (priceLine.match(new RegExp("[" + Object.keys(icons).join("") + "]", "g")) || []).length

        var isEachColorDark = [false, false];
        for (var i = 0; i < 2; ++i)
            isEachColorDark[i] = (i == 1 && normalColorCurrentIndices[1] == 0) ? isEachColorDark[0] : (((normalColorCurrentIndices[i] >= normalColorCustomIndices[i]) ? recolorFactorList[i] : normalColorFactorLists[normalColorCurrentIndices[i] - i][1]).slice(0, 3).reduce(function getSum(total, num) {
                return total + parseFloat(num);
            }) <= 1.5);
        var differentIntensities = isEachColorDark[0] != isEachColorDark[1];

        if (!(differentIntensities || parseInt(normalColorCurrentIndices[1]) == 0 || parseInt(normalColorCurrentIndices[0]) + 1 == parseInt(normalColorCurrentIndices[1]))) {
            document.getElementById('color2splitselector').removeAttribute("style");
        } else {
            document.getElementById('color2splitselector').setAttribute("style", "display:none");
        }

        function drawPicture(xCenter, yCenter, width, height) {
            if (picture.height) {
                var scale;
                if (picture.width / width > picture.height / height) { //size of area to draw picture to
                    scale = height / picture.height;
                } else {
                    scale = width / picture.width;
                }

                let sizeX = picture.width * scale * pictureZoom;
                let sizeY = picture.height * scale * pictureZoom;
                let spaceX = sizeX - width;
                let spaceY = sizeY - height;
                let moveX = parseFloat(pictureX) * spaceX / 2;
                let moveY = parseFloat(pictureY) * spaceY / 2;

                context.save();
                context.translate(xCenter + moveX, yCenter + moveY);
                context.scale(scale * pictureZoom, scale * pictureZoom);
                context.drawImage(picture, picture.width / -2, picture.height / -2);
                context.restore();
            }
        }

        function removeCorners(width, height, radius) {
            context.clearRect(0, 0, radius, radius);
            context.clearRect(width - radius, 0, radius, radius);
            context.clearRect(0, height - radius, radius, radius);
            context.clearRect(width - radius, height - radius, radius, radius);
        }

        function drawExpansionIcon(xCenter, yCenter, width, height) {
            if (expansion.height) {
                var scale;
                if (expansion.width / width < expansion.height / height) { //size of area to draw picture to
                    scale = height / expansion.height;
                } else {
                    scale = width / expansion.width;
                }
                context.save();
                context.translate(xCenter, yCenter);
                context.scale(scale, scale);
                context.drawImage(expansion, expansion.width / -2, expansion.height / -2);
                context.restore();
            }
        }

        if (templateSize == 0) { //card
            drawPicture(704, 706, 1150, 835);
            removeCorners(1403, 2151, 100);

            context.drawImage(getRecoloredImage(0, 0), 0, 0); //CardColorOne
            if (normalColorCurrentIndices[1] > 0) { //two colors are different
                let splitPosition = document.getElementById("color2split").value;
                if (splitPosition == 27) {
                    context.drawImage(getRecoloredImage(1, 1), 0, 0); //CardColorTwo - Half
                    context.drawImage(images[27], 0, 0); //CardColorThree
                } else {
                    context.drawImage(getRecoloredImage(!differentIntensities ? splitPosition : 12, 1), 0, 0); //CardColorTwo
                }
            }
            context.drawImage(getRecoloredImage(2, 0, 6), 0, 0); //CardGray
            context.drawImage(getRecoloredImage(16, 0, 9), 0, 0); //CardBrown
            if (normalColorCurrentIndices[0] > 0 && !isEachColorDark[0] && normalColorCurrentIndices[1] == 0) //single (non-Action, non-Night) color
                context.drawImage(images[3], 44, 1094); //DescriptionFocus

            if (travellerTypesPattern.test(typeLine) || document.getElementById("traveller").checked) {
                context.save();
                context.globalCompositeOperation = "luminosity";
                if (isEachColorDark[0])
                    context.globalAlpha = 0.33;
                context.drawImage(images[4], 524, 1197); //Traveller
                context.restore();
            }

            context.textAlign = "center";
            context.textBaseline = "middle";
            //context.font = "small-caps" + context.font;
            if (heirloomLine) {
                context.drawImage(images[13], 97, 1720); //Heirloom banner
                writeSingleLine(heirloomLine, 701, 1799, 1040, 58, "myText");
            }
            if (isEachColorDark[1])
                context.fillStyle = "white";
            writeSingleLine(document.getElementById("title").value, 701, 215, previewLine ? 800 : 1180, 75);
            if (typeLine.split(" - ").length >= 4) {
                let types2 = typeLine.split(" - ");
                let types1 = types2.splice(0, Math.ceil(types2.length / 2));
                let left = priceLine ? 750 + 65 * (numberPriceIcons - 1) : 701;
                let right = priceLine ? 890 - 65 * (numberPriceIcons - 1) : 1180;
                writeSingleLine(types1.join(" - ") + " -", left, 1922 - 26, right, 42);
                writeSingleLine(types2.join(" - "), left, 1922 + 26, right, 42);
            } else {
                if (expansion.height > 0 && expansion.width > 0) {
                    let left = priceLine ? 730 + 65 * (numberPriceIcons - 1) : 701;
                    let right = priceLine ? 800 - 65 * (numberPriceIcons - 1) : 900;
                    writeSingleLine(typeLine, left, 1922, right, 64);
                } else {
                    let left = priceLine ? 750 + 125 * (numberPriceIcons - 1) : 701;
                    let right = priceLine ? 890 - 85 * (numberPriceIcons - 1) : 1180;
                    writeSingleLine(typeLine, left, 1922, right, 64);
                }
            }
            if (priceLine)
                writeLineWithIconsReplacedWithSpaces(priceLine + " ", 153, 1940, 85 / 90, "mySpecials"); //adding a space confuses writeLineWithIconsReplacedWithSpaces into thinking this isn't a line that needs resizing
            if (previewLine) {
                writeSingleLine(previewLine += " ", 223, 210, 0, 0, "mySpecials");
                writeSingleLine(previewLine, 1203, 210, 0, 0, "mySpecials");
            }
            context.fillStyle = (isEachColorDark[0]) ? "white" : "black";
            if (!heirloomLine)
                writeDescription("description", 701, 1500, 960, 660, 64);
            else
                writeDescription("description", 701, 1450, 960, 560, 64);
            writeIllustrationCredit(150, 2038, "white", "");
            writeCreatorCredit(1253, 2038, "white", "");

            drawExpansionIcon(1230, 1920, 80, 80);

        } else if (templateSize == 1) { //event/landscape
            drawPicture(1075, 584, 1887, 730);
            removeCorners(2151, 1403, 100);

            if (document.getElementById("trait").checked) {
                context.drawImage(getRecoloredImage(28, 0), 0, 0); //TraitColorOne
                if (heirloomLine)
                    context.drawImage(images[14], 146, 832); //EventHeirloom

                context.drawImage(getRecoloredImage(29, 0, 6), 0, 0); //TraitUncoloredDetails
                context.drawImage(getRecoloredImage(15, 0, 9), 0, 0); //EventBar
                context.drawImage(getRecoloredImage(30, 0), 0, 0); //TraitColorSide
                context.drawImage(getRecoloredImage(31, 0, 6), 0, 0); //TraitUncoloredDetailsSide
                context.drawImage(getRecoloredImage(15, 0, 9), 0, 0); //EventBar

            } else {

                context.drawImage(getRecoloredImage(6, 0), 0, 0); //EventColorOne
                if (heirloomLine)
                    context.drawImage(images[14], 146, 832); //EventHeirloom
                if (normalColorCurrentIndices[1] > 0) //two colors are different
                    context.drawImage(getRecoloredImage(7, 1), 0, 0); //EventColorTwo
                context.drawImage(getRecoloredImage(8, 0, 6), 0, 0); //EventUncoloredDetails
                context.drawImage(getRecoloredImage(15, 0, 9), 0, 0); //EventBar
            }

            //no Traveller

            context.textAlign = "center";
            context.textBaseline = "middle";
            //context.font = "small-caps" + context.font;
            if (heirloomLine)
                writeSingleLine(heirloomLine, 1074, 900, 1600, 58, "myText");
            if (isEachColorDark[0])
                context.fillStyle = "white";

            if (document.getElementById("trait").checked) {

                if (typeLine) {
                    writeSingleLine(typeLine, 1075, 165, 780, 70);
                }

                context.save();
                context.rotate(Math.PI * 3 / 2);
                writeSingleLine(document.getElementById("title").value, -700, 2030, 750, 70);
                context.restore();
                context.save();
                context.rotate(Math.PI / 2);
                writeSingleLine(document.getElementById("title").value, 700, -120, 750, 70);
                context.restore();


            } else {

                writeSingleLine(document.getElementById("title").value, 1075, 165, 780, 70);

                if (typeLine) {
                    context.save();
                    context.translate(1903, 240);
                    context.rotate(45 * Math.PI / 180);
                    context.scale(1, 0.8); //yes, the letters are shorter
                    writeSingleLine(typeLine, 0, 0, 283, 64);
                    context.restore();
                }

            }

            if (priceLine)
                writeLineWithIconsReplacedWithSpaces(priceLine + " ", 130, 205, 85 / 90, "mySpecials"); //adding a space confuses writeLineWithIconsReplacedWithSpaces into thinking this isn't a line that needs resizing
            writeDescription("description", 1075, 1107, 1600, 283, 70);
            writeIllustrationCredit(181, 1272, "black", "bold ");
            writeCreatorCredit(1969, 1272, "black", "bold ");

            drawExpansionIcon(1930, 1190, 80, 80);

        } else if (templateSize == 2) { //double card
            drawPicture(704, 1075, 1150, 564);
            removeCorners(1403, 2151, 100);

            if (!recoloredImages[9]) recoloredImages[10] = false;
            context.drawImage(getRecoloredImage(9, 0), 0, 0); //DoubleColorOne
            if (!isEachColorDark[0])
                context.drawImage(images[3], 44, 1330, images[3].width, images[3].height * 2 / 3); //DescriptionFocus
            context.save();
            context.rotate(Math.PI);
            context.drawImage(getRecoloredImage(10, (normalColorCurrentIndices[1] > 0) ? 1 : 0), -1403, -2151); //DoubleColorOne again, but rotated
            if (!isEachColorDark[1])
                context.drawImage(images[3], 44 - 1403, 1330 - 2151, images[3].width, images[3].height * 2 / 3); //DescriptionFocus
            context.restore();
            context.drawImage(images[11], 0, 0); //DoubleUncoloredDetails //todo

            function drawHalfCard(t, l, p, d, colorID) {
                context.textAlign = "center";
                context.textBaseline = "middle";
                //context.font = "small-caps" + context.font;
                //writeSingleLine(document.getElementById(l).value, 701, 215, 1180, 75);

                var recolorFactors;
                if (normalColorCurrentIndices[colorID] >= normalColorCustomIndices[colorID])
                    recolorFactors = recolorFactorList[colorID];
                else
                    recolorFactors = normalColorFactorLists[normalColorCurrentIndices[colorID] - colorID][1];

                context.save();
                var title = document.getElementById(l).value;
                var size = 75 + 2;
                do {
                    context.font = (size -= 2) + "pt myTitle";
                } while (context.measureText(title).width > 750);
                context.textAlign = "left";
                context.fillStyle = "rgb(" + Math.round(recolorFactors[0] * 224) + "," + Math.round(recolorFactors[1] * 224) + "," + Math.round(recolorFactors[2] * 224) + ")";
                context.lineWidth = 15;
                if (isEachColorDark[colorID])
                    context.strokeStyle = "white";
                context.strokeText(title, 150, 1287);
                context.fillText(title, 150, 1287);
                context.restore();

                if (isEachColorDark[colorID])
                    context.fillStyle = "white";
                writeSingleLine(t, p ? 750 : 701, 1922, p ? 890 : 1190, 64);
                if (p)
                    writeLineWithIconsReplacedWithSpaces(p + " ", 153, 1940, 85 / 90, "mySpecials");
                writeDescription(d, 701, 1600, 960, 460, 64);
                context.restore();
            }
            context.save();
            drawHalfCard(typeLine, "title", priceLine, "description", 0);
            context.save();
            context.translate(1403, 2151); //bottom right corner
            context.rotate(Math.PI);
            shadowDistance = -shadowDistance;
            drawHalfCard(heirloomLine, "title2", previewLine, "description2", (normalColorCurrentIndices[1] > 0) ? 1 : 0);
            shadowDistance = -shadowDistance;
            context.textAlign = "left";
            writeIllustrationCredit(150, 2038, "white", "");
            writeCreatorCredit(1253, 2038, "white", "");

            drawExpansionIcon(1230, 1920, 80, 80);

        } else if (templateSize == 3) { //base card
            drawPicture(704, 1075, 1150, 1898);
            removeCorners(1403, 2151, 100);

            context.drawImage(getRecoloredImage(20, 0), 0, 0); //CardColorOne
            context.drawImage(getRecoloredImage(21, 0, 6), 0, 0); //CardGray
            context.drawImage(getRecoloredImage(22, 0, 9), 0, 0); //CardBrown

            context.textAlign = "center";
            context.textBaseline = "middle";
            //context.font = "small-caps" + context.font;
            if (heirloomLine) {
                context.drawImage(images[13], 97, 1720); //Heirloom banner
                writeSingleLine(heirloomLine, 701, 1799, 1040, 58, "myText");
            }
            if (isEachColorDark[1])
                context.fillStyle = "white";
            writeSingleLine(document.getElementById("title").value, 701, 215, previewLine ? 800 : 1180, 75);
            if (typeLine.split(" - ").length >= 4) {
                let types2 = typeLine.split(" - ");
                let types1 = types2.splice(0, Math.ceil(types2.length / 2));
                writeSingleLine(types1.join(" - ") + " -", priceLine ? 750 : 701, 1945 - 26, priceLine ? 890 : 1180, 42);
                writeSingleLine(types2.join(" - "), priceLine ? 750 : 701, 1945 + 26, priceLine ? 890 : 1180, 42);
            } else {
                if (expansion.height > 0 && expansion.width > 0) {
                    writeSingleLine(typeLine, priceLine ? 730 : 701, 1945, priceLine ? 800 : 900, 64);
                } else {
                    writeSingleLine(typeLine, priceLine ? 750 : 701, 1945, priceLine ? 890 : 1180, 64);
                }
            }
            if (priceLine)
                writeLineWithIconsReplacedWithSpaces(priceLine + " ", 153, 1947, 85 / 90, "mySpecials"); //adding a space confuses writeLineWithIconsReplacedWithSpaces into thinking this isn't a line that needs resizing
            if (previewLine) {
                writeSingleLine(previewLine += " ", 223, 210, 0, 0, "mySpecials");
                writeSingleLine(previewLine, 1203, 210, 0, 0, "mySpecials");
            }
            context.fillStyle = (isEachColorDark[0]) ? "white" : "black";
            if (!heirloomLine)
                writeDescription("description", 701, 1060, 960, 1500, 64);
            else
                writeDescription("description", 701, 1000, 960, 1400, 64);
            writeIllustrationCredit(165, 2045, "white", "");
            writeCreatorCredit(1225, 2045, "white", "");

            drawExpansionIcon(1230, 1945, 80, 80);
        } else if (templateSize == 4) { //pile marker
            drawPicture(1075, 702, 1250, 870);
            removeCorners(2151, 1403, 100);

            context.drawImage(getRecoloredImage(24, 0, 6), 0, 0); //CardGray
            context.drawImage(getRecoloredImage(23, 0), 0, 0); //CardColorOne

            context.textAlign = "center";
            context.textBaseline = "middle";

            context.save();
            if (isEachColorDark[1])
                context.fillStyle = "white";
            context.rotate(Math.PI / 2);
            writeSingleLine(document.getElementById("title").value, 700, -1920, 500, 75);
            context.restore();
            context.save();
            if (isEachColorDark[1])
                context.fillStyle = "white";
            context.rotate(Math.PI * 3 / 2);
            writeSingleLine(document.getElementById("title").value, -700, 230, 500, 75);
            context.restore();
        } else if (templateSize == 5) { //player mat
            drawPicture(464, 342, 928, 684);


            context.drawImage(getRecoloredImage(25, 0, 6), 0, 0); //MatBannerTop
            if (document.getElementById("description").value.trim().length > 0)
                context.drawImage(getRecoloredImage(26, 0, 6), 0, 0); //MatBannerBottom

            context.textAlign = "center";
            context.textBaseline = "middle";

            if (isEachColorDark[1])
                context.fillStyle = "white";
            writeSingleLine(document.getElementById("title").value, 464, 96, 490, 55);

            writeDescription("description", 464, 572, 740, 80, 44);

            writeIllustrationCredit(15, 660, "white", "", 16);
            writeCreatorCredit(913, 660, "white", "", 16);

            drawExpansionIcon(888, 40, 40, 40);

        }

        //finish up
        //context.restore();

        updateURL();

        document.getElementById("load-indicator").setAttribute("style", "display:none;");
        canvases[0].parentNode.removeAttribute("data-status");
        return;
    }
    var nextDrawInstruction = 0;

    function queueDraw(time) {
        if (nextDrawInstruction)
            window.clearTimeout(nextDrawInstruction);
        nextDrawInstruction = window.setTimeout(draw, time || 1500);
    }

    function switchColors() {
        var col1 = document.getElementById("normalcolor1").options.selectedIndex;
        var col2 = document.getElementById("normalcolor2").options.selectedIndex;
        if (col2 > 0) {
            let col1_copy = copy(col1);
            normalColorCurrentIndices[0] = document.getElementById("normalcolor1").options.selectedIndex = col2 - 1;
            normalColorCurrentIndices[1] = document.getElementById("normalcolor2").options.selectedIndex = col1_copy + 1;
            recoloredImages = [];
            queueDraw(1);
        }
    };

    function updateURL() {
        var arguments = "?";
        for (var i = 0; i < simpleOnChangeInputFieldIDs.length; ++i) {
            if (simpleOnChangeInputCheckboxIDs.includes(simpleOnChangeInputFieldIDs[i])) {
                arguments += simpleOnChangeInputFieldIDs[i] + "=" + encodeURIComponent(document.getElementById(simpleOnChangeInputFieldIDs[i]).checked) + "&";
            } else {
                arguments += simpleOnChangeInputFieldIDs[i] + "=" + encodeURIComponent(document.getElementById(simpleOnChangeInputFieldIDs[i]).value) + "&";
            }
            if (templateSize == 2 && i < simpleOnChangeButOnlyForSize2InputFieldIDs.length)
                arguments += simpleOnChangeButOnlyForSize2InputFieldIDs[i] + "=" + encodeURIComponent(document.getElementById(simpleOnChangeButOnlyForSize2InputFieldIDs[i]).value) + "&";
        }
        arguments += "picture=" + encodeURIComponent(document.getElementById("picture").value) + "&";
        arguments += "expansion=" + encodeURIComponent(document.getElementById("expansion").value) + "&";
        arguments += "custom-icon=" + encodeURIComponent(document.getElementById("custom-icon").value);
        for (var i = 0; i < normalColorDropdowns.length; ++i) {
            switch (normalColorCustomIndices[i] - normalColorDropdowns[i].selectedIndex) {
                case 0: //custom
                    for (var ch = 0; ch < 3; ++ch)
                        arguments += "&c" + i + "." + ch + "=" + recolorInputs[i * 12 + ch].value;
                    break;
                case -1: //extra custom
                    for (var ch = 0; ch < 12; ++ch) {
                        var recolorInputsIndex = i * 12 + ch;
                        if (recolorInputs.length <= recolorInputsIndex)
                            break;
                        arguments += "&c" + i + "." + ((ch / 3) | 0) + "." + (ch % 3) + "=" + recolorInputs[i * 12 + ch].value;
                    }
                    break;
                default: //preconfigured
                    arguments += "&color" + i + "=" + normalColorDropdowns[i].selectedIndex;
                    break;
            }
        }
        arguments += "&size=" + templateSize;
        history.replaceState({}, "Dominion Card Image Generator", arguments);
    }


    // help function to load images CORS save // https://stackoverflow.com/a/43001137
    function loadImgAsBase64(url, callback, maxWidth, maxHeight) {
        let canvas = document.createElement('CANVAS');
        let img = document.createElement('img');
        img.crossOrigin = "Anonymous";
        if (url.substr(0, 11) != 'data:image/' && url.substr(0, 8) != 'file:///') {
            img.src = CORS_ANYWHERE_BASE_URL + url;
        } else {
            img.src = url;
        }
        img.onload = () => {
            let context = canvas.getContext('2d');
            if (maxWidth > 0 && maxHeight > 0) {
                canvas.width = maxWidth;
                canvas.height = maxHeight;
            } else {
                canvas.height = img.height;
                canvas.width = img.width;
            }
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            let dataURL = canvas.toDataURL('image/png');
            canvas = null;
            callback(dataURL);
        };
        img.onerror = () => {
            useCORS = false;
            console.log("CORS loading of external resources deactivated");
            callback(url);
        };
    }


    // initialize stage
    var sources = [
		"CardColorOne.png",
		"CardColorTwo.png",
		"CardGray.png",
		"DescriptionFocus.png",
		"Traveller.png",
		"", //illustration //5
		"EventColorOne.png",
		"EventColorTwo.png",
		"EventBrown.png",
		"DoubleColorOne.png",
		"DoubleColorOne.png", //10
		"DoubleUncoloredDetails.png",
		"CardColorTwoNight.png",
		"Heirloom.png",
		"EventHeirloom.png",
		"EventBrown2.png", //15
		"CardBrown.png",
        "", //expansion
		"CardColorTwoSmall.png",
		"CardColorTwoBig.png",
		"BaseCardColorOne.png", //20
		"BaseCardGray.png",
		"BaseCardBrown.png",
		"PileMarkerColorOne.png",
		"PileMarkerGrey.png",
        "MatBannerTop.png", //25
        "MatBannerBottom.png",
        "CardColorThree.png",
		"TraitColorOne.png",
		"TraitBrown.png",
		"TraitColorOneSide.png", //30
		"TraitBrownSide.png"
		//icons come afterwards
	];
    for (var i = 0; i < sources.length; i++)
        recoloredImages.push(false);
    var legend = document.getElementById("legend");
    var numberFirstIcon = sources.length;
    for (key in icons) {
        var li = document.createElement("li");
        li.textContent = ": " + icons[key][0];
        var span = document.createElement("span");
        span.classList.add("def");
        span.textContent = key.replace("\\", "");
        li.insertBefore(span, li.firstChild);
        legend.insertBefore(li, legend.firstChild);
        sources.push(icons[key][0] + ".png");
    }
    for (var i = 0; i < sources.length; i++) {
        images.push(new Image());
        images[i].crossOrigin = "Anonymous";
        images[i].src = "card-resources/" + sources[i];
    }

    var simpleOnChangeInputCheckboxIDs = ["traveller", "trait"];
    var simpleOnChangeInputFieldIDs = ["title", "description", "type", "credit", "creator", "price", "preview", "type2", "color2split", "boldkeys", "picture-x", "picture-y", "picture-zoom"];
    simpleOnChangeInputFieldIDs = simpleOnChangeInputFieldIDs.concat(simpleOnChangeInputCheckboxIDs);
    var simpleOnChangeButOnlyForSize2InputFieldIDs = ["title2", "description2"];
    for (var i = 0; i < simpleOnChangeInputFieldIDs.length; ++i) {
        document.getElementById(simpleOnChangeInputFieldIDs[i]).onchange = queueDraw;
        if (i < simpleOnChangeButOnlyForSize2InputFieldIDs.length)
            document.getElementById(simpleOnChangeButOnlyForSize2InputFieldIDs[i]).onchange = queueDraw;
    }
    var recolorInputs = document.getElementsByName("recolor");
    var alreadyNeededToDetermineCustomAccentColors = false;
    for (var i = 0; i < recolorInputs.length; ++i)
        recolorInputs[i].onchange = function (i) {
            return function () {
                var val = parseFloat(this.value);
                if (val !== NaN) {
                    var imageID = Math.floor(i / 12);
                    if (normalColorCurrentIndices[imageID] >= 10) { //potentially recoloring the supposedly Uncolored images
                        recoloredImages[2] = false;
                        recoloredImages[8] = false;
                        recoloredImages[11] = false;
                        recoloredImages[15] = false;
                        recoloredImages[16] = false;
                        recoloredImages[29] = false;
                        recoloredImages[31] = false;
                    }
                    recoloredImages[imageID] = false;
                    recoloredImages[imageID + 6] = false;
                    recoloredImages[imageID + 9] = false;
                    recoloredImages[12] = false;
                    recoloredImages[18] = false;
                    recoloredImages[19] = false;
                    recoloredImages[20] = false;
                    recoloredImages[23] = false;
                    recoloredImages[28] = false;
                    recoloredImages[30] = false;
                    recolorFactorList[imageID][i % 12] = val;
                    queueDraw();
                }
            }
        }(i);

    function setImageSource(id, src) {
        images[id].src = src;
        images[id].crossOrigin = "Anonymous";
        imagesLoaded = false;
        queueDraw(250);
    }

    function onChangeExternalImage(id, value, maxWidth, maxHeight) {
        let url = (sources[id] = value.trim());

        if (url != "[local image]") {
            if (url.length > 0 && useCORS) {
                loadImgAsBase64(url, (dataURL) => {
                    setImageSource(id, dataURL)
                }, maxWidth, maxHeight);
            } else {
                setImageSource(id, url);
            }
        }
    }

    function onUploadImage(id, file) {
        var reader = new FileReader();
        reader.onload = () => {
            setImageSource(id, reader.result);
            console.log("image loaded");
        };
        reader.readAsDataURL(file);
    }


    if (document.getElementById("trait").checked) {
        document.body.classList.add("trait");
    }

    document.getElementById("trait").addEventListener('change', () => {
        if (document.getElementById("trait").checked) {
            document.body.classList.add("trait");
        } else {
            document.body.classList.remove("trait");
        }
    }, false);

    try {
        // Image 5 = Main Picture
        document.getElementById("picture").onchange = function () {
            document.getElementById("picture-upload").value = "";
            onChangeExternalImage(5, this.value);
        };
        document.getElementById("picture-upload").onchange = (event) => {
            document.getElementById("picture").value = "[local image]";
            onUploadImage(5, event.target.files[0]);
        };
    } catch (err) {}

    try {
        // Image 17 = Expansion Icon
        document.getElementById("expansion").onchange = function () {
            document.getElementById("expansion-upload").value = "";
            onChangeExternalImage(17, this.value);
        };
        document.getElementById("expansion-upload").onchange = (event) => {
            document.getElementById("expansion").value = "[local image]";
            onUploadImage(17, event.target.files[0]);
        };
    } catch (err) {}

    try {
        //Last Icon = Custom Icon
        var customIcon = document.getElementById("custom-icon");
        onChangeExternalImage(images.length - 1, customIcon.value, 156, 156);
        customIcon.onchange = function () {
            document.getElementById("custom-icon-upload").value = "";
            onChangeExternalImage(images.length - 1, this.value, 156, 156);
        };
        document.getElementById("custom-icon-upload").onchange = (event) => {
            customIcon.value = "[local image]";
            onUploadImage(images.length - 1, event.target.files[0]);
        };
    } catch (err) {}

    var genericCustomAccentColors = [
		[0, 0, 0, 0, 0, 0, 1, 1, 1, 1.2, 0.8, 0.5],
		[0, 0, 0, 0, 0, 0, 0.9, 0.8, 0.7, 0.9, 0.8, 0.7]
	];
    for (i = 0; i < normalColorDropdowns.length; ++i)
        normalColorDropdowns[i].onchange = function (i) {
            return function () {
                if (normalColorCurrentIndices[i] >= 10 || this.selectedIndex >= 10) { //potentially recoloring the supposedly Uncolored images
                    recoloredImages[2] = false;
                    recoloredImages[8] = false;
                    recoloredImages[11] = false;
                    recoloredImages[15] = false;
                    recoloredImages[16] = false;
                    recoloredImages[29] = false;
                    recoloredImages[31] = false;
                }
                normalColorCurrentIndices[i] = this.selectedIndex;
                recoloredImages[i] = false;
                recoloredImages[i + 6] = false;
                recoloredImages[i + 9] = false;
                recoloredImages[2] = false;
                recoloredImages[12] = false;
                recoloredImages[18] = false;
                recoloredImages[19] = false;
                recoloredImages[20] = false;
                recoloredImages[23] = false;
                recoloredImages[28] = false;
                recoloredImages[30] = false;
                var delta = normalColorCustomIndices[i] - this.selectedIndex;
                if (delta <= 0)
                    this.nextElementSibling.removeAttribute("style");
                else
                    this.nextElementSibling.setAttribute("style", "display:none;");
                if (delta === -1) {
                    this.nextElementSibling.nextElementSibling.removeAttribute("style");
                    if (i === 0 && !alreadyNeededToDetermineCustomAccentColors) {
                        alreadyNeededToDetermineCustomAccentColors = true;
                        for (var j = 6; j < 12; ++j)
                            recolorFactorList[0][j] = recolorInputs[j].value = genericCustomAccentColors[templateSize & 1][j];
                    }
                } else
                    this.nextElementSibling.nextElementSibling.setAttribute("style", "display:none;");
                queueDraw(1);
            }
        }(i);
    var templateSizeInputs = document.getElementsByName("size");
    for (var i = 0; i < templateSizeInputs.length; ++i)
        templateSizeInputs[i].onchange = function (i) {
            return function () {
                templateSize = parseInt(this.value);
                document.body.className = this.id;
                document.body.classList.add("trait");
                document.getElementById("load-indicator").removeAttribute("style");
                queueDraw(250);
            }
        }(i);

    //ready to begin: load information from query parameters
    var query = getQueryParams(document.location.search);
    document.body.className = "";
    for (var queryKey in query) {
        switch (queryKey) {
            case "color0":
                normalColorCurrentIndices[0] = normalColorDropdowns[0].selectedIndex = query[queryKey];
                break;
            case "color1":
                normalColorCurrentIndices[1] = normalColorDropdowns[1].selectedIndex = query[queryKey];
                break;
            case "size":
                var buttonElement = document.getElementsByName("size")[templateSize = parseInt(query[queryKey])];
                document.body.classList.add(buttonElement.id);
                buttonElement.checked = true;
                break;
            case "traveller":
                var checkboxElement = document.getElementById(queryKey);
                checkboxElement.checked = query[queryKey] === 'true';
                break;
            case "trait":
                var checkboxElement = document.getElementById(queryKey);
                checkboxElement.checked = query[queryKey] === 'true';
                if (checkboxElement.checked === true) {
                    document.body.classList.add(queryKey);
                }
                break;
            default:
                var matches = queryKey.match(/^c(\d)\.(\d)$/);
                if (matches) {
                    var id = matches[1];
                    normalColorCurrentIndices[id] = normalColorDropdowns[id].selectedIndex = normalColorCustomIndices[id];
                    normalColorDropdowns[id].nextElementSibling.removeAttribute("style");
                    recolorFactorList[id][matches[2]] = recolorInputs[12 * id + parseInt(matches[2])].value = parseFloat(query[queryKey]);
                } else {
                    matches = queryKey.match(/^c(\d)\.(\d)\.(\d)$/);
                    if (matches) {
                        alreadyNeededToDetermineCustomAccentColors = true;
                        var id = matches[1];
                        normalColorCurrentIndices[id] = normalColorDropdowns[id].selectedIndex = normalColorCustomIndices[id] + 1;
                        normalColorDropdowns[id].nextElementSibling.removeAttribute("style");
                        normalColorDropdowns[id].nextElementSibling.nextElementSibling.removeAttribute("style");
                        recolorFactorList[id][parseInt(matches[2]) * 3 + parseInt(matches[3])] = recolorInputs[12 * id + 3 * parseInt(matches[2]) + parseInt(matches[3])].value = parseFloat(query[queryKey]);
                    } else {
                        var el = document.getElementById(queryKey);
                        if (el)
                            el.value = query[queryKey];
                    }
                }
                break;
        }
        for (var i = 0; i < simpleOnChangeButOnlyForSize2InputFieldIDs.length; ++i)
            if (!document.getElementById(simpleOnChangeButOnlyForSize2InputFieldIDs[i]).value)
                document.getElementById(simpleOnChangeButOnlyForSize2InputFieldIDs[i]).value = document.getElementById(simpleOnChangeButOnlyForSize2InputFieldIDs[i].substr(0, simpleOnChangeButOnlyForSize2InputFieldIDs[i].length - 1)).value;
    }
    //set the illustration's Source properly and also call queueDraw.
    document.getElementById("picture").onchange();
    document.getElementById("expansion").onchange();
    document.getElementById("custom-icon").onchange();

    //adjust page title
    function adjustPageTitle() {
        let cardTitle = document.getElementById("title").value.trim();
        let creator = document.getElementById("creator").value.trim();
        let pageDefaultTitle = "Dominion Card Image Generator";
        document.title = cardTitle.length > 0 ? (pageDefaultTitle + " - " + cardTitle + " " + creator) : pageDefaultTitle;
    };
    document.getElementById('title').addEventListener('change', adjustPageTitle, false);
    document.getElementById('creator').addEventListener('change', adjustPageTitle, false);
    adjustPageTitle();

    //redraw after color switch
    document.getElementById('color-switch-button').addEventListener('click', switchColors, false);

    //pass parameters to original version to enable easy comparison
    document.getElementById('linkToOriginal').addEventListener('click', function (event) {
        event.preventDefault();
        window.location.href = this.href + document.location.search;
    }, false);

}

function getQueryParams(qs) { //http://stackoverflow.com/questions/979975/how-to-get-the-value-from-the-get-parameters
    qs = qs.split('+').join(' ');

    var params = {},
        tokens,
        re = /[?&]?([^&=]+)=?([^&]*)/g;

    while (tokens = re.exec(qs)) {
        params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }

    return params;
}

// function to download the finished card
function downloadPicture() {

    function isTainted(ctx) {
        // https://stackoverflow.com/a/22581873
        try {
            var pixel = ctx.getImageData(0, 0, 1, 1);
            return false;
        } catch (err) {
            return (err.code === 18);
        }
    }

    function dataURLtoBlob(dataurl) {
        var arr = dataurl.split(','),
            mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]),
            n = bstr.length,
            u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {
            type: mime
        });
    }

    var id;
    if (templateSize == 0 || templateSize == 2 || templateSize == 3) {
        id = 0;
    } else if (templateSize == 1 || templateSize == 4) {
        id = 1;
    } else {
        id = 2;
    }
    var link = document.getElementById("download");
    var canvases = document.getElementsByClassName("myCanvas");
    var canvas = canvases[id];

    if (isTainted(canvas)) {
        alert('Sorry, canvas is tainted! Please use the right-click-option to save your image.');
    } else {
        var image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        var title = document.getElementById("title").value.trim();
        var creator = document.getElementById("creator").value.trim();
        var fileName = "";
        if (title.length > 0) {
            fileName += title;
        } else {
            fileName += "card";
        }
        if (creator.length > 0) {
            fileName += "_" + creator.split(" ")[0];
        }
        fileName = fileName.split(" ").join("_");
        fileName += ".png";
        link.setAttribute('download', fileName);
        var url = (window.webkitURL || window.URL).createObjectURL(dataURLtoBlob(image));
        link.setAttribute("href", url);
    }

}

function Favorites(name) {
    var name = name;
    var fav = document.getElementById("manage-favorites");
    var favList = document.getElementById("favorites-list");
    var data = localStorage.getItem('favorites') ? JSON.parse(localStorage.getItem('favorites')) : [];
    var ascending = true;

    this.export = function () {
        let jsonData = localStorage.getItem('favorites');
        download(jsonData, 'dominion-card-generator-favorites.json', 'text/plain');

        function download(content, fileName, contentType) {
            let a = document.createElement("a");
            let file = new Blob([content], {
                type: contentType
            });
            a.href = URL.createObjectURL(file);
            a.download = fileName;
            a.click();
        }
    };
    this.import = function () {
        let myFavs = this;

        let inp = document.createElement("input");
        inp.type = 'file';

        inp.onchange = e => {
            let file = e.target.files[0];
            let reader = new FileReader();
            reader.readAsText(file, 'UTF-8');
            reader.onload = readerEvent => {
                let content = readerEvent.target.result;
                let newData = JSON.parse(content);
                data = data.concat(newData);
                myFavs.save();

            }
        }
        inp.click();

    }


    this.open = function () {
        this.refresh();
        fav.classList.remove('hidden');
        document.getElementById('favorites-search').focus();
    };
    this.close = function () {
        fav.classList.add('hidden');
    };
    this.deleteAll = function () {
        data = [];
        this.save();
    };
    this.delete = function (params) {
        this.refresh();
        data = data.remove(params);
        this.save();
    };
    this.add = function (params) {
        this.refresh();
        data = data.remove(params);
        data.push(params);
        this.save();
    };
    this.load = function (params) {
        window.location.href = this.href + params;
    }
    this.save = function () {
        localStorage.setItem('favorites', JSON.stringify(data));
        this.refresh();
    }
    this.sort = function () {
        data.sort();
        if (ascending === false) {
            data.reverse();
            console.log('Favorites sorted in descending order.');
            ascending = true;
        } else {
            console.log('Favorites sorted in ascending order.');
            ascending = false;
        }
        this.save();
        this.refresh();
    }
    this.search = function (term) {
        let children = favList.childNodes;
        for (child in children) {
            if (!isNaN(child)) {
                if (children[child].hasChildNodes()) {
                    var cardname = children[child].childNodes[0].innerHTML;
                    if (cardname.toUpperCase().includes(term.toUpperCase())) {
                        children[child].classList.remove('hidden');
                    } else {
                        children[child].classList.add('hidden');
                    }
                }
            }
        }
    }
    this.refresh = function (params) {
        data = localStorage.getItem('favorites') ? JSON.parse(localStorage.getItem('favorites')) : [];

        while (favList.firstChild) {
            favList.removeChild(favList.firstChild);
        }
        data.forEach(function (item) {
            let title = getQueryParams(item).title == "" ? "<unnamed card>" : getQueryParams(item).title.trim();
            let types = '[' + getQueryParams(item).type.trim() + '] ';
            let price = getQueryParams(item).price.replace('^', 'P').trim();
            switch (getQueryParams(item).size) {
                case '0': // normal card
                    title = getQueryParams(item).type.trim() == "" ? title : types + title;
                    title = price == "" ? title : price + ' ' + title;
                    title = "Card: " + title;
                    break;
                case '1': // landscape card
                    title = getQueryParams(item).type.trim() == "" ? title : types + title;
                    title = price == "" ? title : price + ' ' + title;
                    title = "Landscape: " + title;
                    break;
                case '2': // double card
                    title = '[' + getQueryParams(item).type.trim() + ' | ' + getQueryParams(item).type2.trim() + '] ' + title;
                    let title2 = getQueryParams(item).title2.trim();
                    title = title2 == "" ? title : title + ' | ' + title2;
                    title = price == "" ? title : price + ' ' + title;
                    title = "Double: " + title;
                    break;
                case '3': // base card
                    title = getQueryParams(item).type.trim() == "" ? title : types + title;
                    title = price == "" ? title : price + ' ' + title;
                    title = "Base Card: " + title;
                    break;
                case '4': // pile marker (like bane)
                    title = "Pile Marker: " + title;
                    break;
                case '5': // mat
                    title = "Mat: " + title;
                    break;
            }
            title = getQueryParams(item).creator == "" ? title : title + ' ' + getQueryParams(item).creator.split(" ")[0];

            let li = document.createElement("li");
            let a = document.createElement("a");
            a.setAttribute('href', location.pathname + item);
            a.appendChild(document.createTextNode(title));
            if (item === document.location.search) {
                li.setAttribute('class', "active");
            }
            li.appendChild(a);
            let bttnDel = document.createElement("button");
            bttnDel.setAttribute('class', "delete");
            bttnDel.setAttribute('onclick', name + ".delete('" + item + "')");
            let imgDel = document.createElement("img");
            imgDel.setAttribute('src', "assets/icon-delete.png");
            bttnDel.appendChild(imgDel);
            bttnDel.appendChild(document.createTextNode("Delete"));
            li.appendChild(bttnDel);
            favList.appendChild(li);
        });
    };
}

class FontHandler {

    constructor() {
        this.custom = document.getElementById('fontLocal');
        this.defaultTitle = document.getElementById('fontDefaultTitle');
        this.defaultSpecials = document.getElementById('fontDefaultSpecials');
        this.defaultText = document.getElementById('fontDefaultText');
        this.dialog = document.getElementById("manage-fonts");
        document.getElementById("openFontSettings").classList.remove("hidden");
        this.load();
    }

    open() {
        this.dialog.classList.remove('hidden');
        document.getElementById('fontInputTitle').focus();
    }

    close() {
        this.dialog.classList.add('hidden');
    }

    save() {
        this.saveSettings();
        this.applySettings();
        this.close();
    }

    saveSettings() {
        this.settings = {
            title: document.getElementById('fontInputTitle').value,
            specials: document.getElementById('fontInputSpecials').value,
            text: document.getElementById('fontInputText').value
        };
        localStorage.setItem('fontSettings', JSON.stringify(this.settings));
    }

    applySettings() {
        this.setFonts(this.settings.title, this.settings.specials, this.settings.text);
    }

    load() {
        let hasAnyCustomSettings = false;
        this.settings = localStorage.getItem('fontSettings') ? JSON.parse(localStorage.getItem('fontSettings')) : {};
        if (this.settings.title) {
            document.getElementById('fontInputTitle').value = this.settings.title;
            hasAnyCustomSettings = true;
        }
        if (this.settings.specials) {
            document.getElementById('fontInputSpecials').value = this.settings.specials;
            hasAnyCustomSettings = true;
        }
        if (this.settings.text) {
            document.getElementById('fontInputText').value = this.settings.text;
            hasAnyCustomSettings = true;
        }

        if (hasAnyCustomSettings) {
            this.applySettings();
        }
    }

    check() {
        if (this.settings.title) {
            document.fonts.check("1em '" + this.settings.title + "'");
            console.log("Font available for title: " + this.settings.title);
        }
        if (this.settings.specials) {
            document.fonts.check("1em '" + this.settings.specials + "'");
            console.log("Font available for specials: " + this.settings.specials);
        }
        if (this.settings.text) {
            document.fonts.check("1em '" + this.settings.text + "'");
            console.log("Font available for text: " + this.settings.text);
        }
    }

    reset() {
        document.getElementById('fontInputTitle').value = '';
        document.getElementById('fontInputSpecials').value = '';
        document.getElementById('fontInputText').value = '';
        this.save();
    }

    setFonts(lclFontTitle, lclFontSpecials, lclFontText) {

        let css = "";

        if (lclFontTitle !== "") {
            css += this.getFontFaceCSS('myTitle', lclFontTitle);
            this.defaultTitle.href = '#';
        } else {
            this.defaultTitle.href = './fonts/font-title.css';
        }

        if (lclFontSpecials !== "") {
            css += this.getFontFaceCSS('mySpecials', lclFontSpecials);
            this.defaultSpecials.href = '#';
        } else {
            this.defaultSpecials.href = './fonts/font-specials.css';
        }

        if (lclFontText !== "") {
            css += this.getFontFaceCSS('myText', lclFontText, 'normal');
            css += this.getFontFaceCSS('myText', lclFontText + " Bold", 'bold');
            this.defaultText.href = '#';
        } else {
            this.defaultText.href = './fonts/font-text.css';
        }

        this.custom.innerHTML = css;
        this.triggerChange();
    }

    getFontFaceCSS(myName, lclName, fontWeight) {
        let cssWeight = "";
        if (fontWeight) {
            cssWeight = ' font-weight: ' + fontWeight + ';'
        }
        return '@font-face { font-family: "' + myName + '"; src: local("' + lclName + '");' + cssWeight + ' } ';
    }

    triggerChange() {
        document.getElementById("title").onchange();
    }
}

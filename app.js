const getCursorPosition = (canvas, event) => {  
    const rect = canvas.getBoundingClientRect(); 
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return [x, y]; 
}
const clearInput = (inputEl) =>{ 
    inputEl.value = ""; 
}
// returns width and height of text 
const getFontDimensions = (ctx, text) =>{
    const metrics = ctx.measureText(text);  
    const width = metrics.width;
    const height = Math.abs(metrics.fontBoundingBoxAscent) + Math.abs(metrics.fontBoundingBoxDescent);
    return [width, height];  
}
class TextObject{
    constructor(x, y){ 
        this.x = x; 
        this.y = y;
        this.lines = ['']; // default
        this.selected = false;
        this.linkedTo = [];
    }
    replaceLines(newLines){ 
        this.lines = newLines; 
    }
    getLastLine(){
        return this.lines[this.lines.length -1]; 
    }
    replaceLastLine(text){ 
        this.lines[this.lines.length -1 ] = text; 
    }
    getLines(){
        return this.lines; 
    }
    appendToLines(newLine){
        this.lines.push(newLine); 
    }
    getMaxLineWidthIdx(){
        const lengths = this.lines.map(str => str.length); 
        const maxLength = Math.max(...lengths);
        return lengths.indexOf(maxLength); 
    }
    getMaxLine(){
        return this.lines[ this.getMaxLineWidthIdx() ]; 
    }
    // returns width and height of box 
    getBoxDimensions(ctx){
        const text = this.getMaxLine();  
        const [w, lineHeight] = getFontDimensions(ctx, text);
        const h = lineHeight * this.lines.length;
        return [w, h]; 
    }
    inBbox(ctx, x, y){
        const [w, h] = this.getBoxDimensions(ctx);  
        const pad = 15;  
        return x >= this.x && x <= this.x + w + pad && y >= this.y - pad && y <= this.y + h -pad;       
    }
    drawLine(ctx, lineNum, text){
        const [_, height] = getFontDimensions(ctx, text); 
        ctx.fillText(text , this.x, this.y + height*lineNum); 
    }
    drawLines(ctx){
        this.lines.forEach((line, idx) =>{
            this.drawLine(ctx, idx, line);
        }); 
    }
    clearBoxRect(ctx){ 
        const text = this.getMaxLine(); 
        const [w, lineHeight] = getFontDimensions(ctx, text);
        // clear rect needs a bit more padding than stroke rect so that's what these magic 
        // numbers are about, I found them through experimentation but I imagine its because 
        // of the clear rect doesn't acount for line width of the actual box 
        const pad = 15 + ctx.lineWidth; 
        ctx.clearRect(this.x - ctx.lineWidth , this.y - pad , w + pad + 2 , lineHeight* (this.lines.length) + 2);   
    }
    drawBox(ctx){
        const text = this.getMaxLine(); 
        const [w, lineHeight] = getFontDimensions(ctx, text);
        const pad = 15;
        if (this.isSelected()){
            ctx.strokeStyle = "red"; 
        }
        ctx.strokeRect(this.x, this.y - pad, w + pad , lineHeight* (this.lines.length));
        ctx.strokeStyle = "#000000"; 
         
    }
    drawTextBox(ctx){ 
        this.clearBoxRect(ctx);
        this.drawLines(ctx);
        this.drawBox(ctx);  
    }
    isSelected(){
        return this.selected === true;   
    }
    toggleSelected(){
        this.selected = !this.selected; 
    }
    removeLinked(line){
        this.linkedTo = this.linkedTo.filter(curLine => curLine !== line); 
    }
    addLinked(line){
        this.linkedTo.push(line); 
    }
    getLinked(){
        return this.linkedTo; 
    }
}

const drawLine = (ctx, from, to) =>{ 
    const [from_x, from_y] = from; 
    const [to_x, to_y] = to; 
    ctx.beginPath();
    ctx.moveTo(from_x, from_y);
    ctx.lineTo(to_x, to_y); 
    ctx.stroke();
}

// returns true if cur and other are slightly overlapping 
const areOverLapping = (ctx, cur, other) =>{
    const [curW, curH] = cur.getBoxDimensions(ctx); 
    const [otherW, otherH] = other.getBoxDimensions(ctx);
    let overlap = false;
    const pad = 15; // we must account for the pad we add during the drawBox methods in TextObject instances 
    // cur topLeft, topRight, bottLeft, bottRight 
    const curPoints = [ [cur.x, cur.y], [cur.x + curW + pad, cur.y], [cur.x, cur.y+ curH], [cur.x + curW + pad, cur.y + curH]]
    .map(array=> [array[0] , array[1] -pad]); 

    curPoints.forEach( (point) =>{ 
        const [x,y] = point; 
        overlap = overlap || other.inBbox(ctx, x, y); 
    });
    const otherPoints = [ [other.x, other.y], [other.x + otherW + pad, other.y], [other.x, other.y + otherH], [other.x + otherW + pad, other.y + otherH]] 
    .map(array=> [array[0] , array[1] -pad]);  

    otherPoints.forEach( (point) =>{
        const [x,y] = point; 
        overlap = overlap || cur.inBbox(ctx, x, y);  
    });
    return overlap; 
}

const getOverLappedTextBox = (ctx, textObjects, draggedFig) =>{
    const otherTextBoxes = textObjects.filter(t=> t !== draggedFig); 
    return otherTextBoxes.find(t => areOverLapping(ctx, t, draggedFig)); 
}
// relocates textobject to new position by deleting textObject at last location and redrawing at updated location.
// Updates textObject's location properties. 
const relocateTextObject = (ctx, textBox, x, y, lastX, lastY) =>{ 
    textBox.clearBoxRect(ctx);
    const offsetX = x - lastX; 
    const offsetY = y - lastY;   
    textBox.x += offsetX; 
    textBox.y += offsetY; 
    textBox.drawTextBox(ctx); 
}

const createNewTab = (tabRoot, tabId) =>{
    // create tab div 
    const tabDiv = document.createElement("div");
    tabDiv.className = "tab";
    tabDiv.id = `${tabId}`; // set id to unique tabId
    const tabTitle = document.createElement("h3");
    tabTitle.textContent = "Untitled";
    // bind elements 
    tabDiv.appendChild(tabTitle); 
    tabRoot.appendChild(tabDiv);
    return tabDiv; // return element so that we can attach an event listener 

}
// resizes tabs so that they all fit within the tab container 
const resizeTabs = (tabRoot, tabDiv) =>{  
    // reformat tabs if they exceed available space  
    const totalPixelsAvailable = document.querySelector(".tab-section").clientWidth; 
    const numOfTabs = tabRoot.childElementCount;
    if (numOfTabs*tabDiv.clientWidth > totalPixelsAvailable){
        const tabs = Array.from(document.querySelectorAll(".tab"));
        tabs.forEach( tab =>{
            tab.style.width = `${totalPixelsAvailable/numOfTabs - 23}px`; 
        }); 
    }
}
const deleteTab = (curTab, tabRoot) =>{
    tabRoot.removeChild(curTab); 
}

const selectLastTab = (tabList) =>{
    tabList[tabList.length -1].click(); 
}

// clears the canvas, draws the lines and textboxes onto canvas. 
const drawCanvas = (ctx, canvas, lineObjects, textObjects) =>{ 
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    lineObjects.forEach( line => drawLine(ctx, [line.fromX, line.fromY], [line.toX, line.toY]));
    textObjects.forEach( t => t.drawTextBox(ctx));
}
// returns hashMap of all current data structures etc, 
const createCanvasState = (clickX, clickY, textObjects, selectedTextObjects, lineObjects, linesToBoxes, draggedFig, draggedOverTextBox) =>{
    const stateHash = new Map(); 
    stateHash.set('clickX', clickX); 
    stateHash.set('clickY', clickY); 
    stateHash.set('textObjects', textObjects); 
    stateHash.set('selectedTextObjects', selectedTextObjects); 
    stateHash.set('lineObjects', lineObjects); 
    stateHash.set('linesToBoxes', linesToBoxes); 
    stateHash.set('draggedFig', draggedFig); 
    stateHash.set('draggedOverTextBox', draggedOverTextBox); 
    return stateHash; 
}

window.onload = () =>{
    const userInput = document.querySelector("#user-input"); 
    const canvas = document.getElementById("mimi-canvas");
    const ctx = canvas.getContext("2d");
    const del = document.querySelector("#delete");
    const link = document.querySelector("#link");
    const clear = document.querySelector("#clear");
    const download = document.querySelector("#download");
    const tabSection = document.querySelector(".tab-section");
    const newTab = document.querySelector("#new-tab");
    const renameTab = document.querySelector("#rename-tab");
    const closeModal = document.getElementsByClassName("close")[0]; 
    const modal = document.querySelector(".modal");
    const closeTab = document.querySelector("#close-tab"); 

    // Canvas configurations 
    ctx.font = "15pt Comic Sans MS";

    const SPECIAL_CHAR = '~'; // special character we will split lines by
    let TAB_ID = 0; // creates unique tab ids for the tabs 
    let clickX, clickY;
    let textObjects = [];
    let selectedTextObjects = [];
    let lineObjects = [];
    let linesToBoxes = new Map(); 
    let draggedFig;
    let draggedOverTextBox;
    let curCanvasStateIdx = 0;  
    let canvasStates = new Map();  

    // HELP FOR THE USER 
    const helpfulTextObj = new TextObject(400,100); 
    helpfulTextObj.lines = [
        "To make a textbox, click anywhere and begin typing.",
        "To delete, click on the textbox and press 'delete' ", 
        "To add more text to me, click on textbox and begin typing"
    ];
     
    textObjects.push(helpfulTextObj); 
    helpfulTextObj.drawTextBox(ctx, helpfulTextObj.lines);
    
    
    // event handlers
    window.addEventListener("keydown" , (event) =>{ 
        if (event.key === "Enter"){
            userInput.value += SPECIAL_CHAR;
            const existingTextObject = textObjects.find(textObj => textObj.x === clickX && textObj.y === clickY); 
            const newLines = userInput.value.split(SPECIAL_CHAR);
            existingTextObject.replaceLines(newLines); 
            existingTextObject.drawTextBox(ctx); 
        } 
    });
    // this fires before a click, this is where we do dragging 'cleanup' and reinitializing. 
    canvas.addEventListener("mouseup", () =>{
        // reinitialize variables set in 'drag mode'. 
        if (draggedFig){ 
            // when the length is 0 this is evaluated as false 
            if (draggedFig.getLinked().length){
                
                draggedFig.getLinked().forEach( line =>{
                    console.log("canvas", curCanvasStateIdx, "lines to boxes = ", linesToBoxes); 
                    const otherBox = linesToBoxes.get(line).find(tbox => tbox !== draggedFig);
                    const otherBoxLine = otherBox.getLinked().find( linkedLine => linkedLine === line); 
                    // update line properties 
                    [line, otherBoxLine].forEach( l =>{
                        l.fromX = draggedFig.x; 
                        l.fromY = draggedFig.y; 
                        l.toX = otherBox.x; 
                        l.toY = otherBox.y; 
                    });
                    // add newly updated line ref to lineObjects list
                    if (!lineObjects.includes(line)){
                        lineObjects.push(line);  
                    }
                    
                });
                // redraw canvas with our newly added lines
                drawCanvas(ctx, canvas, lineObjects, textObjects); 
            }
            draggedFig = null;
            draggedOverTextBox = null; 
        }
    }); 

    canvas.addEventListener("click", (event)=>{ 
        
        [clickX, clickY] = getCursorPosition(canvas, event);
        clearInput(userInput);

        const existingTextObject = textObjects.find(textObj => textObj.inBbox(ctx, clickX, clickY));  

        if (!existingTextObject){
            const newTextBox = new TextObject(clickX, clickY);  
            textObjects.push(newTextBox);
            newTextBox.drawTextBox(ctx);  
            return userInput.focus(); 
        }
        // user clicked on an already existing box 
        existingTextObject.toggleSelected(); 

        if (existingTextObject.isSelected() ){
            selectedTextObjects.push(existingTextObject); 
        }else{
            selectedTextObjects = selectedTextObjects.filter(textbox=> textbox !== existingTextObject); 
        }
        existingTextObject.drawTextBox(ctx);  
        // fill input with current lines in case they wish to add or delete the text within box 
        userInput.value = existingTextObject.lines.join(SPECIAL_CHAR); 
        userInput.focus();    
    });

    canvas.addEventListener("mousedown", (event) =>{
        [clickX, clickY] = getCursorPosition(canvas, event);
        const existingTextObject = textObjects.find(textObj => textObj.inBbox(ctx, clickX, clickY));
        // user is clicking to create new textbox not drag or select a currenty existing one. 
        if (!existingTextObject){
            return; 
        }
        draggedFig = existingTextObject;
    });

    canvas.addEventListener("mousemove", (event) =>{ 
        if (draggedFig){ 
            // want to check if there are any lines on canvas of dragged fig 
            if (draggedFig.getLinked().length > 0 ){
                const firstLine = draggedFig.getLinked()[0];
                // need to delete the lines from canvas 
                if (lineObjects.includes(firstLine)){
                    // remove reference to the lines 
                    draggedFig.getLinked().forEach( line =>{
                        lineObjects = lineObjects.filter(lineObj => lineObj !== line); 
                    }); 
                    // redraw canvas 
                    drawCanvas(ctx, canvas, lineObjects, textObjects); 
                }
            }

            const [lastClickX, lastClickY] = [clickX, clickY]; 
            [clickX, clickY] = getCursorPosition(canvas, event);
            

            const overlappedTextBox = getOverLappedTextBox(ctx, textObjects, draggedFig);

            if(!draggedOverTextBox){
                draggedOverTextBox = overlappedTextBox; 
            }
            if (draggedOverTextBox){
                draggedOverTextBox.drawTextBox(ctx); 
            }
            relocateTextObject(ctx, draggedFig, clickX, clickY, lastClickX, lastClickY); 

            if (draggedOverTextBox !== overlappedTextBox){
                // redraw dragged over textbox 
                draggedOverTextBox.drawTextBox(ctx); 
                draggedOverTextBox = overlappedTextBox; 
            }
             
        }
    }); 

    userInput.addEventListener("input", ()=>{

        const existingTextObject = textObjects.find(textObj => textObj.inBbox(ctx, clickX, clickY));
        clickX = existingTextObject.x; 
        clickY = existingTextObject.y;  
        existingTextObject.clearBoxRect(ctx); 
        const newLines = userInput.value.split(SPECIAL_CHAR); 
        existingTextObject.replaceLines(newLines); 
        existingTextObject.drawTextBox(ctx); 
        
    });

    del.addEventListener("click", ()=>{

        // if there are no linked textboxes within the selected textboxes 
        if ( !selectedTextObjects.some( textbox => textbox.linkedTo) ){ 
            selectedTextObjects.forEach( (textObject) =>{
                textObject.clearBoxRect(ctx); 
            });
            selectedTextObjects.forEach( (textbox) =>{
                textObjects = textObjects.filter( textobj => textobj !== textbox); 
            }); 
        }else{
            // get to lines that are to be deleted
            selectedTextObjects.forEach( selectedTextBox =>{
                selectedTextBox.getLinked().forEach( line =>{
                    // remove reference to these lines
                    try{
                        lineObjects = lineObjects.filter( lineObj => lineObj !== line);
                        const otherTextBox = linesToBoxes.get(line).find(textBox => textBox !== selectedTextBox);  
                        otherTextBox.removeLinked(line);
                        linesToBoxes.delete(line); 
                    }catch(e){
                        console.log("Caught an error here = ", e); 
                    }
                }); 
            });
            // remove all textobjects in textobjects array that are also in selected textObjects 
            textObjects = textObjects.filter( textObj => !selectedTextObjects.includes(textObj));
            // re-draw canvas
            drawCanvas(ctx, canvas, lineObjects, textObjects); 
        } 
        selectedTextObjects = []; 
        clearInput(userInput);
    });

    link.addEventListener("click", ()=>{
        if (selectedTextObjects.length !== 2){
            return console.log("can only link 2 text objects at a time"); 
        }
        const [textOne, textTwo] = selectedTextObjects;
        // init a line object 
        const lineObj = {fromX: textOne.x, fromY: textOne.y, toX: textTwo.x, toY: textTwo.y};
        lineObjects.push(lineObj); 
        const from = [textOne.x, textOne.y]; 
        const to = [textTwo.x, textTwo.y];  
        drawLine(ctx, from, to);
        [textOne, textTwo].forEach( textBox =>{
            textBox.toggleSelected(); 
            textBox.drawTextBox(ctx);   
            textBox.addLinked(lineObj); 
        });  
        selectedTextObjects = [];
        linesToBoxes.set(lineObj, [textOne, textTwo] ); // add reference to line 
    });

    clear.addEventListener("click", ()=>{ 
        // clear canvas 
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        // reset references 
        selectedTextObjects = [];
        textObjects = []; 
        linesToBoxes = new Map();  
        lineObjects = []; 
        clickX = null; 
        clickY = null; 
    });

    download.addEventListener("click", ()=> { 

        const imgData = canvas.toDataURL("image/png", 1.0);
        const pdf = new jsPDF("p", "mm", "a4");

        const ratio = canvas.width/canvas.height; 
        const width = pdf.internal.pageSize.width;
        const height = width / ratio; 

        pdf.addImage(imgData, 'PNG',0,10, width, height);
        pdf.setLineWidth(2);
        pdf.rect(0, 10, width, height); 
        pdf.save("download.pdf"); 
    });
    // this is kind of sloppy but only way I can think to do this so that I can still access the curCanvasState variable
    // in a pass by reference environment 
    const createTabEventListener = (tab) =>{
        tab.addEventListener("click", ()=>{
            console.log("event listener being triggered on click"); 
            const lastActiveTab = document.querySelector(".current"); 
            lastActiveTab.classList.remove("current");
            const lastCanvasStateIdx = parseInt(lastActiveTab.id);
            // create state before we clear canvas 
            const lastCanvasState = createCanvasState(

                clickX, clickY, textObjects, selectedTextObjects, lineObjects, linesToBoxes, draggedFig, draggedOverTextBox

                ); 
            canvasStates.set(lastCanvasStateIdx, lastCanvasState); 
            tab.classList.add("current"); 
            curCanvasStateIdx = parseInt(tab.id);
            // load new state hashMap 
            const newState = canvasStates.get(curCanvasStateIdx);
            // first time seeing this state, reinit all vars 
            if (!newState){
                clickX = null;
                clickY = null;
                textObjects = [];
                selectedTextObjects = [];
                lineObjects = [];
                linesToBoxes = new Map(); 
                draggedFig = null;
                draggedOverTextBox; 
            }else{ // load vars from newState map 
                clickX = newState.get('clickX'); 
                clickY = newState.get('clickY'); 
                textObjects = newState.get('textObjects'); 
                selectedTextObjects = newState.get('selectedTextObjects'); 
                lineObjects = newState.get('lineObjects'); 
                linesToBoxes = newState.get('linesToBoxes'); 
                draggedFig = newState.get('draggedFig');
                draggedOverTextBox = newState.get('draggedOverTextBox'); 
            }
            // with all our reinitilizaed variables, draw them onto canvas 
            drawCanvas(ctx, canvas, lineObjects, textObjects);
            // console.log("Current Canvas State:", curCanvasState); 
        });
    }
     // configure initial tab -- to be dynamic 
    createTabEventListener(document.getElementById("0")); 
    // create new tab and add an event listener to it 
    newTab.addEventListener("click", () =>{
        // tabSection is the tabRoot element 
        const tab = createNewTab(tabSection, ++TAB_ID); 
        resizeTabs(tabSection, tab);  
        createTabEventListener(tab); 
    });

    renameTab.addEventListener("click", ()=>{
        const curTab = document.getElementById(`${curCanvasStateIdx}`); 
        // grab custom modal component and delete all its children 
        const modalComponent = document.querySelector("#modal-component"); 
        modalComponent.replaceChildren();
        // create html elements 
        const title = document.createElement("h3");
        const input = document.createElement("input"); 
        const change = document.createElement("button");
        const discard = document.createElement("button");
        // customize 
        title.textContent = `Enter new Name for '${curTab.textContent}':`;
        change.textContent = "Change"; 
        discard.textContent = "Cancel";
        // create event listeners for buttons
        change.onclick = () => {
            // change the text
            curTab.firstChild.textContent = input.value; 
            // close the modal 
            modal.style.display = "none";  
        }
        discard.onclick = () => {
            // close the modal 
            modal.style.display = "none"; 
        } 
        
        // bind elements 
        [title, input, change, discard].forEach(el => modalComponent.appendChild(el)); 
        // open the modal 
        modal.style.display = "block";
    });

    closeModal.addEventListener("click", () =>{
        // close the modal 
        modal.style.display = "none"; 
    });

    closeTab.addEventListener("click", ()=>{
        const curTab = document.getElementById(`${curCanvasStateIdx}`);
        const tabRoot = document.querySelector(".tab-section"); 
        const numOfTabs = tabRoot.childElementCount;
        // don't want user to be able to close tab when there is only one tab present
        if (numOfTabs === 1){
            return console.log("Cannot close tab when there is only one tab open"); 
        }
        const tabs = document.querySelectorAll(".tab");
        const tabsWithoutCurTab = Array.from(tabs).filter(el => el!== curTab); 
        selectLastTab(tabsWithoutCurTab); // selects last tab on tablist goes into event handler we created for this tab earlier on 
        deleteTab(curTab, tabRoot); // removes tab from tabs --> need to delete after selecting other tab 
    }); 

}

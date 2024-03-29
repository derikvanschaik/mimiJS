const getCursorPosition = (canvas, event) => {  
    const rect = canvas.getBoundingClientRect(); 
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return [x, y]; 
}
const clearInput = (inputEl) =>{ 
    inputEl.value = ""; 
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

const createNewTab = (tabRoot, tabId, tabName = "Untitled") =>{
    // create tab div 
    const tabDiv = document.createElement("div");
    tabDiv.className = "tab";
    tabDiv.id = `${tabId}`; // set id to unique tabId
    const tabTitle = document.createElement("h3");
    tabTitle.textContent = tabName;
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
// tabs are divs with an h3 child element whose textcontent is the name 
const getTabName = (tab) =>{
    return tab.firstChild.textContent; 
}

// clears the canvas, draws the lines and textboxes onto canvas. 
const drawCanvas = (ctx, canvas, lineObjects, textObjects, hotLinkState) =>{
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    lineObjects.forEach( line => drawLine(ctx, [line.fromX, line.fromY], [line.toX, line.toY]));
    textObjects.forEach( t => t.drawTextBox(ctx, hotLinkState)); 
}
// Purpose: deletes lines from line objects list, redraws the canvas with newly filtered lineobjects list
// RETURNS: list of line objects 
const deleteConnectedLines = (draggedFig, ctx, canvas, lineObjects, textObjects, hotLinksOn) =>{
    const firstLine = draggedFig.getLinked()[0];
    // need to delete the lines from canvas 
    if (lineObjects.includes(firstLine)){
        // remove reference to the lines 
        draggedFig.getLinked().forEach( line =>{
            lineObjects = lineObjects.filter(lineObj => lineObj !== line); 
        }); 
        // redraw canvas 
        drawCanvas(ctx, canvas, lineObjects, textObjects, hotLinksOn);  
    }
    return lineObjects; 
}
// Purpose: appends array of new X and Y points to dragPath list if there was a change in its current location
// RETURNS: Undefined 
const updateDragPath = (draggedFig, lastClickX, lastClickY, clickX, clickY) =>{
    if (Math.abs(clickX - lastClickX) >= 1 && Math.abs(clickY-lastClickY) >=1 ){
        draggedFig.dragPath.push([clickX, clickY]); 
    }
}
// Purpose: returns textObject that was last clicked 
// RETURNS: textObject if a textbox was selected or undefined if no textbox in textObjects array was selected. 
const getSelectedTextObject = (textObjects, ctx, clickX, clickY) =>{ 
    const selectedTextObject = textObjects.find(textObj => textObj.inBbox(ctx, clickX, clickY));
    console.log("Selected textObject:", selectedTextObject); 
    return selectedTextObject; 
}
// returns hashMap of all current data structures etc, 
const createCanvasState = (clickX, clickY, textObjects, selectedTextObjects, lineObjects, linesToBoxes, draggedFig, draggedOverTextBox, stateName) =>{
    const stateHash = new Map(); 
    stateHash.set('clickX', clickX); 
    stateHash.set('clickY', clickY); 
    stateHash.set('textObjects', textObjects); 
    stateHash.set('selectedTextObjects', selectedTextObjects); 
    stateHash.set('lineObjects', lineObjects); 
    stateHash.set('linesToBoxes', linesToBoxes); 
    stateHash.set('draggedFig', draggedFig); 
    stateHash.set('draggedOverTextBox', draggedOverTextBox);
    stateHash.set('stateName', stateName); 
    return stateHash; 
}
const createErrorModal = (modalComponent, errorMessage) =>{
    // since we re use this component there may be previous elements bound to it
    // so we delete them 
    modalComponent.replaceChildren(); 
    const errorTitle = document.createElement("h3"); 
    errorTitle.textContent = errorMessage; 
    modalComponent.appendChild(errorTitle); 
}

 // import modules 
 import {TextObject} from './modules/textbox.js'; 

window.onload = () =>{
   
    // grab html element refs 
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
    const makeHotLink = document.querySelector("#make-hotlink");
    const toggleHotLink = document.querySelector("#toggle-hotlinks"); 

    // Canvas configurations 
    ctx.font = "20pt Arial"; 
    // VERY IMPORTANT CONFIGURATION FOR DRAWING TEXTBOXES 
    ctx.textBaseline = 'top'; 

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
    let hotLinksOn = false; 

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
        // when user types the enter key we want to move the nextLine down one line level (create a new line effect)
        if (event.key === "Enter"){
            // append split input value by our special char (symbol for return carriage character)
            userInput.value += SPECIAL_CHAR;
            const newLines = userInput.value.split(SPECIAL_CHAR);
            // get the textbox being typed into, replace its lines with newly created lines and redraw textbox 
            const existingTextObject = getSelectedTextObject(textObjects, ctx, clickX, clickY); 
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
                drawCanvas(ctx, canvas, lineObjects, textObjects, hotLinksOn);  
            }
            draggedFig = null;
            draggedOverTextBox = null; 
        }
    }); 

    canvas.addEventListener("click", (event)=>{ 
        
        [clickX, clickY] = getCursorPosition(canvas, event);
        clearInput(userInput);

        const existingTextObject = getSelectedTextObject(textObjects, ctx, clickX, clickY); 

        if (!existingTextObject){
            const newTextBox = new TextObject(clickX, clickY);  
            textObjects.push(newTextBox);
            newTextBox.drawTextBox(ctx);  
            return userInput.focus(); 
        }
        // check if there was a drag path -> if there was then this existing textbox was just dragged and this event
        // was only triggered because they dropped the object. We do not want to count this as a 'toggle' event. 
        if (existingTextObject.dragPath.length > 0){
            // reset the drag path 
            return existingTextObject.dragPath = []; 
        }
        // check to see if user clicked on a hotlink 
        if (hotLinksOn){
            if( existingTextObject.hotLink !== null){
                const redirectToTabId = existingTextObject.hotLink;
                return document.getElementById(`${redirectToTabId}`).click(); // select tab   
            }
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
        const existingTextObject = getSelectedTextObject(textObjects, ctx, clickX, clickY); 
        // user is clicking to create new textbox not drag or select a currenty existing one. 
        if (!existingTextObject){
            return; 
        }
        draggedFig = existingTextObject;
    });

    canvas.addEventListener("mousemove", (event) =>{
        // User is dragging a textObject 
        if (draggedFig){ 
            // if there are any lines connected to dragged figure we want to check if we have deleted those lines.
            if (draggedFig.getLinked().length > 0 ){
                // want to delete these connected lines 
                lineObjects = deleteConnectedLines(draggedFig, ctx, canvas, lineObjects, textObjects, hotLinksOn); 
            }
            
            const [lastClickX, lastClickY] = [clickX, clickY]; 
            [clickX, clickY] = getCursorPosition(canvas, event);
            updateDragPath(draggedFig, lastClickX, lastClickY, clickX, clickY);
            relocateTextObject(ctx, draggedFig, clickX, clickY, lastClickX, lastClickY);
            // redraw entire canvas 
            drawCanvas(ctx, canvas, lineObjects, textObjects, hotLinksOn); 

            // just for preference to user visual --> redraws textobject over others.  
            draggedFig.clearBoxRect(ctx)
            draggedFig.drawTextBox(ctx)
             
        }
    }); 

    userInput.addEventListener("input", ()=>{

        const existingTextObject = getSelectedTextObject(textObjects, ctx, clickX, clickY); 
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
            drawCanvas(ctx, canvas, lineObjects, textObjects, hotLinksOn);  
        } 
        selectedTextObjects = []; 
        clearInput(userInput);
    });

    link.addEventListener("click", ()=>{
        if (selectedTextObjects.length !== 2){
            const errorMessage = "Can Only Link 2 Text Objects at a time";
            createErrorModal(document.querySelector("#modal-component"), errorMessage); // create error modal
            return modal.style.display = "block"; // make modal visible 
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

            const lastActiveTab = document.querySelector(".current"); 
            lastActiveTab.classList.remove("current");
            const lastCanvasStateIdx = parseInt(lastActiveTab.id);
            const tabName = getTabName(lastActiveTab); 
            // create state before we clear canvas 
            const lastCanvasState = createCanvasState(

                clickX, clickY, textObjects, selectedTextObjects, lineObjects, linesToBoxes, draggedFig, draggedOverTextBox, tabName, 

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
            drawCanvas(ctx, canvas, lineObjects, textObjects, hotLinksOn);
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
            const errorMessage = "Cannot close tab when it is the only tab open.";
            createErrorModal(document.querySelector("#modal-component"), errorMessage); // create error modal
            return modal.style.display = "block"; // make modal visible 
        }
        const tabs = document.querySelectorAll(".tab");
        const tabsWithoutCurTab = Array.from(tabs).filter(el => el!== curTab); 
        selectLastTab(tabsWithoutCurTab); // selects last tab on tablist goes into event handler we created for this tab earlier on 
        deleteTab(curTab, tabRoot); // removes tab from tabs --> need to delete after selecting other tab 
    });

    makeHotLink.addEventListener("click", ()=>{
        // get current canvas state 
        const backToState = curCanvasStateIdx; 
        // grab last selected item 
        const existingTextObject = textObjects.find(textObj => textObj.inBbox(ctx, clickX, clickY)); 
        // set selected hotLink property to be the id of the newly created tab 
        existingTextObject.hotLink = ++TAB_ID; // post increment tabid variable 
        // rename tab to be the name of the hotlinked tab  
        const newTabName = existingTextObject.getLines().join("");
        const tab = createNewTab(tabSection,TAB_ID, tabName = newTabName); 
        resizeTabs(tabSection, tab);  
        createTabEventListener(tab);
        // select the new tab 
        tab.click();
        // draw new tab and link the tab links etc 
        const pad = 15;
        const offset = 5; 
        const navBackTextObject = new TextObject(0 + offset, pad + offset); // have this textbox be in top left corner of canvas -> remember the padding of 15 we make so need to offset
        const backTabName = canvasStates.get(backToState).get('stateName'); 
        navBackTextObject.replaceLines([`Back to ${backTabName}`]); 
        navBackTextObject.hotLink = backToState; 
        textObjects.push(navBackTextObject);
        // change hotlink state automatically 
        hotLinksOn = true;
        toggleHotLink.checked = true;  
        drawCanvas(ctx, canvas, lineObjects, textObjects, hotLinksOn);  
    });

    toggleHotLink.addEventListener("click", ()=>{
        // toggle the current hotlinks state
        hotLinksOn = !hotLinksOn;
        // redraw the state of canvas 
        drawCanvas(ctx, canvas, lineObjects, textObjects, hotLinksOn); 
    }); 

}

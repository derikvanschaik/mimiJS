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
        ctx.strokeRect(this.x, this.y - pad, w + pad , lineHeight* (this.lines.length)); 
    }
    drawTextAndLines(ctx){
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
    // cur topLeft, topRight, bottLeft, bottRight 
    curPoints = [ [cur.x, cur.y], [cur.x + curW, cur.y], [cur.x, cur.y+ curH], [cur.x + curW, cur.y + curH]];
    curPoints.forEach( (point) =>{
        const [x,y] = point; 
        overlap = overlap || other.inBbox(ctx, x, y); 
    });
    otherPoints = [ [other.x, other.y], [other.x + otherW, other.y], [other.x, other.y + otherH], [other.x + otherW, other.y + otherH] ]; 
    otherPoints.forEach( (point) =>{
        const [x,y] = point; 
        overlap = overlap || cur.inBbox(ctx, x, y);  
    });
    return overlap; 
}

window.onload = () =>{
    const userInput = document.querySelector("input"); 
    const canvas = document.getElementById("mimi-canvas");
    const ctx = canvas.getContext("2d");
    const del = document.querySelector("#delete");
    const link = document.querySelector("#link");
    const clear = document.querySelector("#clear");
    const selectAll = document.querySelector("#select-all");
    const download = document.querySelector("#download"); 

    // Canvas configurations 
    ctx.font = "15pt Comic Sans MS";

    // global variables
    const SPECIAL_CHAR = '~'; // special character we will split lines by
    let clickX, clickY;
    let textObjects = [];
    let selectedTextObjects = [];
    let lineObjects = [];
    let linesToBoxes = {};
    let draggedFig;
    let draggedOverTextObjects = []; // tracks text objects we 'dragged over' and thus need to redraw once we are done dragging. 

    // HELP FOR THE USER 
    const helpfulTextObj = new TextObject(400,100); 
    helpfulTextObj.lines = [
        "To make a textbox, click anywhere and begin typing.",
        "To delete, click on the textbox and press 'delete' ", 
        "To add more text to me, click on textbox and begin typing"
    ];
     
    textObjects.push(helpfulTextObj); 
    helpfulTextObj.drawTextAndLines(ctx, helpfulTextObj.lines);
    
    // event handlers
    window.addEventListener("keydown" , (event) =>{
        if (event.key === "Enter"){
            userInput.value += SPECIAL_CHAR;
            const existingTextObject = textObjects.find(textObj => textObj.x === clickX && textObj.y === clickY); 
            const newLines = userInput.value.split(SPECIAL_CHAR);
            existingTextObject.replaceLines(newLines); 
            existingTextObject.drawTextAndLines(ctx); 
        } 
    });

    canvas.addEventListener("click", (event)=>{ 
        
        draggedFig = null; 

        [clickX, clickY] = getCursorPosition(canvas, event);
        clearInput(userInput);

        const existingTextObject = textObjects.find(textObj => textObj.inBbox(ctx, clickX, clickY));  

        if (!existingTextObject){
            const newTextBox = new TextObject(clickX, clickY);  
            textObjects.push(newTextBox);
            newTextBox.drawTextAndLines(ctx);  
            return userInput.focus(); 
        }
        // user clicked on an already existing box 
        existingTextObject.toggleSelected(); 

        if (existingTextObject.isSelected() ){
            selectedTextObjects.push(existingTextObject); 
            ctx.strokeStyle = "red"; 
        }else{
            selectedTextObjects = selectedTextObjects.filter(textbox=> textbox !== existingTextObject); 
            ctx.strokeStyle = "#000000"; 
        }
        existingTextObject.drawTextAndLines(ctx);  
        ctx.strokeStyle = "#000000";   // reset global ctx strokeStyle
        // fill input with current lines in case they wish to add or delete the text within box 
        userInput.value = existingTextObject.lines.join(SPECIAL_CHAR); 
        userInput.focus();    
    });

    canvas.addEventListener("mousedown", (event) =>{
        [clickX, clickY] = getCursorPosition(canvas, event);
        const existingTextObject = textObjects.find(textObj => textObj.inBbox(ctx, clickX, clickY));
        draggedFig = existingTextObject;
         
    });

    canvas.addEventListener("mousemove", (event) =>{ 
        if (draggedFig){

            const [lastClickX, lastClickY] = [clickX, clickY]; 
            [clickX, clickY] = getCursorPosition(canvas, event);
            const otherTextBoxes = textObjects.filter(t=> t !== draggedFig); 
            const draggedOverFig = otherTextBoxes.find(t => areOverLapping(ctx, t, draggedFig)); 
            console.log("DRAGGED OVER FIG = ", draggedOverFig); 
            if (draggedOverFig){
                if (!draggedOverTextObjects.includes(draggedOverFig)){
                    draggedOverTextObjects.push(draggedOverFig); 
                }
                draggedOverFig.drawTextAndLines(ctx); 
            }
            if (!draggedOverFig && draggedOverTextObjects.length > 0){
                console.log("in not dragged over fig", draggedOverTextObjects); 
                draggedOverTextObjects.forEach( tBox => tBox.drawTextAndLines(ctx));
                // draggedOverTextObjects = []; // reinit 
            }
            draggedFig.clearBoxRect(ctx);
            const offsetX = clickX - lastClickX; 
            const offsetY = clickY - lastClickY;  
            draggedFig.x += offsetX; 
            draggedFig.y += offsetY; 
            draggedFig.drawTextAndLines(ctx); 
        }
    }); 

    userInput.addEventListener("input", ()=>{

        const existingTextObject = textObjects.find(textObj => textObj.inBbox(ctx, clickX, clickY));
        clickX = existingTextObject.x; 
        clickY = existingTextObject.y;  
        if (existingTextObject.isSelected() ){
            ctx.strokeStyle = "red"; 
        }
        existingTextObject.clearBoxRect(ctx); 
        const newLines = userInput.value.split(SPECIAL_CHAR); 
        existingTextObject.replaceLines(newLines); 
        existingTextObject.drawTextAndLines(ctx); 
        ctx.strokeStyle = "#000000"; 
    });

    del.addEventListener("click", ()=>{
        // in case user pressed select all and then delete 
        selectAll.textContent = "Select All";
        clickX = null; 
        clickY = null;

        // if there are no linked textboxes within the selected textboxes 
        if ( !selectedTextObjects.some( textbox => textbox.linkedTo) ){ 
            selectedTextObjects.forEach( (textObject) =>{
                textObject.clearBoxRect(ctx); 
            });
            selectedTextObjects.forEach( (textbox) =>{
                textObjects = textObjects.filter( textobj => textobj !== textbox); 
            }); 
        }else{
            // clear canvas 
            ctx.clearRect(0 ,0, canvas.width, canvas.height); 
            // get to lines that are to be deleted
            selectedTextObjects.forEach( selectedTextBox =>{
                selectedTextBox.getLinked().forEach( line =>{
                    // remove reference to these lines 
                    lineObjects = lineObjects.filter( lineObj => lineObj !== line);
                    const [otherTextBox] = linesToBoxes[line].filter(textBox => textBox !== selectedTextBox);  
                    otherTextBox.removeLinked(line);
                    
                }); 
            });
            // remove all textobjects in textobjects array that are also in selected textObjects 
            textObjects = textObjects.filter( textObj => !selectedTextObjects.includes(textObj));
            // re-draw remaining lines and textboxes onto canvas
            lineObjects.forEach( lineObj => drawLine(ctx, [lineObj.fromX, lineObj.fromY], [lineObj.toX, lineObj.toY])); 
            textObjects.forEach( textObj => textObj.drawTextAndLines(ctx));   
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
            textBox.drawTextAndLines(ctx); 
            textBox.toggleSelected();  
            textBox.addLinked(lineObj);
        });  
        selectedTextObjects = [];
        linesToBoxes[lineObj] = [textOne, textTwo]; // add reference to line 
    });

    clear.addEventListener("click", ()=>{ 
        // clear canvas 
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        // reset references 
        selectedTextObjects = [];
        textObjects = []; 
        linesToBoxes = {}; 
        lineObjects = []; 
        clickX = null; 
        clickY = null; 
    });

    selectAll.addEventListener("click", ()=>{
        if (selectAll.textContent === "Select All"){
            selectAll.textContent = "De-Select All"; 
            selectedTextObjects = textObjects.map(t => t); // copy contents
            ctx.strokeStyle = "red";  
            selectedTextObjects.forEach(t =>{
                t.selected = true;  
                t.drawTextAndLines(ctx, t.getLines() ); 
            });
            return ctx.strokeStyle = "#000000";
        }
        selectAll.textContent = "Select All"; 
        textObjects.forEach(t => {
            t.selected = false; 
            t.drawTextAndLines(ctx, t.getLines() );
        });
        selectedTextObjects = [];  
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
}

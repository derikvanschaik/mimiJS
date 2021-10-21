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
        this.maxWidth = {length: 0, idx: 0};
        this.selected = false;
        this.linkedTo = [];   
    }
    replaceLines(newLines){ 
        this.lines = newLines; 
    }
    replaceLastLine(text){ 
        this.lines[this.lines.length -1 ] = text; 
    }
    getLines(){
        return this.lines; 
    }
    inBbox(ctx, x, y){
        const text = this.lines[this.maxWidth.idx]; 
        const [w, lineHeight] = getFontDimensions(ctx, text);
        const h = lineHeight * this.lines.length;
        const pad = 15;  
        return x >= this.x && x <= this.x + w + pad && y >= this.y - pad && y <= this.y + h -pad;       
    }
    drawLine(ctx, lineNum, text){
        const [_, height] = getFontDimensions(ctx, text); 
        ctx.fillText(text , this.x, this.y + height*lineNum); 
    }
    drawLines(ctx){
        this.maxWidth = {length: 0, idx: 0}; 
        this.lines.forEach((line, idx) =>{
            this.drawLine(ctx, idx, line);
            if (line.length > this.maxWidth.length){
                this.maxWidth.length = line.length; 
                this.maxWidth.idx = idx; 
            }
        }); 
    }
    clearBoxRect(ctx){ 
        const text = this.lines[this.maxWidth.idx]; 
        const [w, lineHeight] = getFontDimensions(ctx, text);
        // clear rect needs a bit more padding than stroke rect so that's what these magic 
        // numbers are about, I found them through experimentation but I imagine its because 
        // of the clear rect doesn't acount for line width of the actual box 
        const pad = 15 + ctx.lineWidth; 
        ctx.clearRect(this.x - ctx.lineWidth , this.y - pad, w + pad + 2 , lineHeight* (this.lines.length) + 2);   
    }
    drawBox(ctx){
        const text = this.lines[this.maxWidth.idx]; 
        const [w, lineHeight] = getFontDimensions(ctx, text);
        const pad = 15; 
        ctx.strokeRect(this.x, this.y - pad, w + pad , lineHeight* (this.lines.length) ); 
    }
    drawTextAndLines(ctx, newLines){
        try{
            this.clearBoxRect(ctx);
        }catch(e){
        }
        this.lines = newLines;  
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

window.onload = () =>{
    const userInput = document.querySelector("input"); 
    const canvas = document.getElementById("mimi-canvas");
    const ctx = canvas.getContext("2d");
    const del = document.querySelector("#delete");
    const link = document.querySelector("#link"); 

    // Canvas configurations 
    ctx.font = "15pt Comic Sans MS";

    // global variables
    const SPECIAL_CHAR = '~'; // special character we will split lines by 
    let clickX, clickY;
    let textObjects = [];
    let selectedTextObjects = [];
    let lineObjects = [];
    let linesToBoxes = {}; 

    // HELP FOR THE USER 
    const helpfulTextObj = new TextObject(400,100); 
    helpfulTextObj.lines = ["To make a textbox, click anywhere and begin typing.",
                            "To delete, click on the textbox and press 'delete' ", 
                            "To add more text to me, click on textbox and begin typing"]; 
    textObjects.push(helpfulTextObj); 
    helpfulTextObj.drawTextAndLines(ctx, helpfulTextObj.lines);
    
    // event handlers
    window.addEventListener("keydown" , (event) =>{
        if (event.key === "Enter"){
            userInput.value += SPECIAL_CHAR;
            const existingTextObject = textObjects.find(textObj => textObj.x === clickX && textObj.y === clickY); 
            const newLines = userInput.value.split(SPECIAL_CHAR);
            existingTextObject.drawTextAndLines(ctx, newLines); 
        } 
    });

    canvas.addEventListener("click", (event)=>{ 

        const [x,y] = getCursorPosition(canvas, event);
        [clickX, clickY] = [x, y]; 

        if (userInput.value.length > 0 ){ 
            clearInput(userInput);
        }
        const existingTextObject = textObjects.find(textObj => textObj.inBbox(ctx, x, y));  
        if (!existingTextObject){
            textObjects.push(new TextObject(x, y) );
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
        existingTextObject.drawTextAndLines(ctx, existingTextObject.getLines() );  
        ctx.strokeStyle = "#000000";   // reset global ctx strokeStyle
        // fill input with current lines in case they wish to add or delete the text within box 
        userInput.value = existingTextObject.lines.join(SPECIAL_CHAR); 

        userInput.focus();    
    });

    userInput.addEventListener("input", ()=>{

        const existingTextObject = textObjects.find(textObj => textObj.inBbox(ctx, clickX, clickY));
        clickX = existingTextObject.x; 
        clickY = existingTextObject.y;  
        if (existingTextObject.isSelected() ){
            ctx.strokeStyle = "red"; 
        }
        const newLines = userInput.value.split(SPECIAL_CHAR);
        existingTextObject.drawTextAndLines(ctx, newLines);
        ctx.strokeStyle = "#000000"; 
    });

    del.addEventListener("click", ()=>{
        // if there are no linked textboxes within the selected textboxes 
        if ( !selectedTextObjects.some( textbox => textbox.linkedTo) ){ 
            selectedTextObjects.forEach( (textObject) =>{
                textObject.clearBoxRect(ctx); 
            });
            selectedTextObjects.forEach( (textbox) =>{
                // filter out all selected text object from textobjects array  
                textObjects = textObjects.filter( textobj => textobj !== textbox); 
            }); 
            // else clear the entire canvas, only draw the lines which are not connected 
            // to boxes that are selected. Then need to draw remaining lines onto canvas
            // and the remaining boxes 
        }else{
            // clear canvas 
            ctx.clearRect(0 ,0, canvas.width, canvas.height); 
            // get to lines that are to be deleted
            selectedTextObjects.forEach( selectedTextBox =>{
                selectedTextBox.getLinked().forEach( line =>{
                    // remove reference to these lines 
                    lineObjects = lineObjects.filter( lineObj => lineObj !== line);
                    try{
                        const [otherTextBox] = linesToBoxes[line].filter(textBox => textBox !== selectedTextBox);  
                        otherTextBox.removeLinked(line);
                        // just to be extra safe....
                        // delete linesToBoxes[line]; 
                    }catch(e){
                        console.log("error = ", e); 
                        console.log("Error most likely keynotfound error...linesToBoxes[line] = ", linesToBoxes[line]); 
                    }
                    
                }); 
            });
            // remove all textobjects in textobjects array that are also in selected textObjects 
            textObjects = textObjects.filter( textObj => !selectedTextObjects.includes(textObj));
            // re-draw remaining lines and textboxes onto canvas
            lineObjects.forEach( lineObj => drawLine(ctx, [lineObj.fromX, lineObj.fromY], [lineObj.toX, lineObj.toY])); 
            textObjects.forEach( textObj => textObj.drawTextAndLines(ctx, textObj.getLines() ));   
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
            textBox.drawTextAndLines(ctx, textBox.getLines() ); 
            textBox.toggleSelected();  
            textBox.addLinked(lineObj);
        });  
        selectedTextObjects = [];
        linesToBoxes[lineObj] = [textOne, textTwo]; // add reference to line 
    }); 

}

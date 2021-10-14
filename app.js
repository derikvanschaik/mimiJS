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
        this.currentLine = 0;
        this.lines = ['']; // default
        this.maxWidth = {length: 0, idx: 0};
        this.selected = false; 
    }
    replaceLines(newLines){ 
        this.lines = newLines; 
    }
    replaceLastLine(text){ 
        this.lines[this.currentLine] = text; 
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
}


window.onload = () =>{
    const userInput = document.querySelector("input"); 
    const canvas = document.getElementById("mimi-canvas");
    const ctx = canvas.getContext("2d");
    const del = document.querySelector("#delete"); 

    // Canvas configurations 
    ctx.font = "15pt Comic Sans MS";

    // global variables
    const SPECIAL_CHAR = '~'; // special character we will split lines by 
    let clickX, clickY;
    let textObjects = [];
    let selectedTextObjects = []; 
    
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
        }else{
            // user clicked on an already existing box 
            existingTextObject.toggleSelected();
            if (existingTextObject.isSelected() ){
                selectedTextObjects.push(existingTextObject); 
                ctx.strokeStyle = "red";
            }else{
                selectedTextObjects = selectedTextObjects.filter(textbox=> textbox !== existingTextObject); 
                ctx.strokeStyle = "#000000"; 
            }
            existingTextObject.drawTextAndLines(ctx, existingTextObject.lines);  
            ctx.strokeStyle = "#000000";   // reset global ctx strokeStyle
            // fill input with current lines in case they wish to add or delete the text within box 
            userInput.value = existingTextObject.lines.join(SPECIAL_CHAR); 
        }
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
        selectedTextObjects.forEach( (textObject) =>{
            // clear from canvas 
            textObject.clearBoxRect(ctx);
            // remove all references 
            selectedTextObjects = selectedTextObjects.filter(obj => obj !== textObject); 
            textObjects = textObjects.filter(obj => obj !== textObject);  
        });
        
    }); 

}

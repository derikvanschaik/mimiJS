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
        this.maxWidth; 
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
        console.log(h, lineHeight, this.lines.length);
        console.log(x, y); 
        // when creating the boxes, we add a padding of 10 to the y click so we must account for this
        // when judging wether the click was in the bounding box 
        return x >= this.x && x <= this.x + w && y <= this.y && y >= this.y- h;     
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
        ctx.strokeRect(this.x,this.y - pad, w + pad , lineHeight* (this.lines.length) ); 
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
}


window.onload = () =>{
    const userInput = document.querySelector("input"); 
    const canvas = document.getElementById("mimi-canvas");
    const ctx = canvas.getContext("2d");

    // Canvas configurations 
    ctx.font = "15pt Comic Sans MS";

    // global variables
    const SPECIAL_CHAR = '~'; // special character we will split lines by 
    let clickX, clickY;
    let textObjects = []; 
    
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
        console.log("clicked in an already present box"); 
           
    });

    userInput.addEventListener("input", ()=>{

        const existingTextObject = textObjects.find(textObj => textObj.x === clickX && textObj.y === clickY);
        const newLines = userInput.value.split(SPECIAL_CHAR);
        existingTextObject.drawTextAndLines(ctx, newLines);  
    });  

}

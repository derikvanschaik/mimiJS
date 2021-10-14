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
    }
    replaceLines(newLines){ 
        this.lines = newLines; 
    }
    replaceLastLine(text){ 
        this.lines[this.currentLine] = text; 
    }
    inBbox(ctx, x, y){
        const text = this.lines[this.currentLine]; 
        const [w, h] = getFontDimensions(ctx, text);
        // when creating the boxes, we add a padding of 10 to the y click so we must account for this
        // when judging wether the click was in the bounding box 
        return x >= this.x && x <= this.x + w && y <= this.y + 10 && y >= this.y + 10 - h;   
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
        const curText = existingTextObject.lines[existingTextObject.currentLine]; 
        const [width, height] = getFontDimensions(ctx, curText); 
        // // fill new rect and text 
        const pad = 10;
        ctx.fillRect(existingTextObject.x , existingTextObject.y + pad, width, -height);
        
           
    });

    userInput.addEventListener("input", ()=>{
        const existingTextObject = textObjects.find(textObj => textObj.x === clickX && textObj.y === clickY);
        existingTextObject.lines = userInput.value.split(SPECIAL_CHAR);
        existingTextObject.drawLines(ctx);  

        // const [prevWidth, prevHeight] = getFontDimensions(ctx, prevText);
        // existingTextObject.lines = userInput.value.split(SPECIAL_CHAR); 
        // // clearing previous rect drawn, the magic numbers were found through testing what works
        // // and I expect them to be very sensitive to changes made 
        // // ctx.clearRect(clickX , clickY + 12, prevWidth + 5, -prevHeight - 5); 
        
        // const [width, height] = getFontDimensions(ctx, existingTextObject.lines[CURLINE]);   
        // // // fill new rect and text 
        // const pad = 10;
        // existingTextObject.drawLine(ctx);    
        // // ctx.fillText(curText , clickX, clickY); 
        // ctx.strokeRect(clickX, clickY + pad, width, -height); 
    }); 

}

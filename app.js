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
        this.bbox; 
    }
    append(text){ 
        this.lines[this.currentLine] = text; 
    }
}

window.onload = () =>{
    const userInput = document.querySelector("input"); 
    const canvas = document.getElementById("mimi-canvas");
    const ctx = canvas.getContext("2d");

    // Canvas configurations 
    ctx.font = "15pt Comic Sans MS";

    // global variables
    let clickX, clickY;
    let textObjects = []; 
    
    // event handlers
    window.addEventListener("keydown" , (event) =>{
        if (event.key === "Enter"){
            const [_, height] = getFontDimensions(ctx, userInput.value);   
            clickY += height; // append to new line 
        }
    }); 
    canvas.addEventListener("click", (event)=>{

        const [x,y] = getCursorPosition(canvas, event);
        [clickX, clickY] = [x, y]; 

        if (userInput.value.length > 0 ){ 
            clearInput(userInput);
        }
        const existingTextObject = textObjects.find(textObj => textObj.x === x && textObj.y === y); 
        if (!existingTextObject){
            textObjects.push(new TextObject(x, y) );
            return userInput.focus(); 
        }
           
    });

    userInput.addEventListener("input", ()=>{
        const existingTextObject = textObjects.find(textObj => textObj.x === clickX && textObj.y === clickY);
        const curLine = existingTextObject.currentLine; 
        if (existingTextObject.lines[curLine] === ""){
            existingTextObject.append(userInput.value);  
        }
        const prevText = existingTextObject.lines[curLine]; 
        existingTextObject.append(userInput.value);  
        const curText = existingTextObject.lines[curLine]; 

        const [prevWidth, prevHeight] = getFontDimensions(ctx, prevText); 
        // clearing previous rect drawn, the magic numbers were found through testing what works
        // and I expect them to be very sensitive to changes made 
        ctx.clearRect(clickX , clickY + 12, prevWidth + 5, -prevHeight - 5);
        
        const [width, height] = getFontDimensions(ctx, curText); 
        // // fill new rect and text 
        ctx.fillText(curText , clickX, clickY); 
        ctx.strokeRect(clickX, clickY + 10, width, -height);     
    }); 

}

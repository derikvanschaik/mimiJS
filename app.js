const getCursorPosition = (canvas, event) => {
    const rect = canvas.getBoundingClientRect(); 
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return [x, y]; 
}
const clearInput = (inputEl) =>{
    inputEl.value = ""; 
}

window.onload = () =>{
    const userInput = document.querySelector("input"); 
    const canvas = document.getElementById("mimi-canvas");
    const ctx = canvas.getContext("2d");
    // configurations 
    ctx.font = "20px Georgia"; 
    // global variables 
    let clickX, clickY;  
    
    // event handlers 
    canvas.addEventListener("click", (event)=>{
        const [x,y] = getCursorPosition(canvas, event);
        [clickX, clickY] = [x, y];
        clearInput(userInput); // in case there was previous input 
        userInput.focus();  
    });

    userInput.addEventListener("input", ()=>{
        ctx.fillText(userInput.value, clickX, clickY); 
    }); 

}

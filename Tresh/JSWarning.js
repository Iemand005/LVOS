//
/// - 
//// - 
document.getElementsByTagName("body")[0].addEventListener("load", function(){
    var nojs = document.getElementById("nojavascript");
    console.log("Checking JS");
    try {
        eval("const a=0");
        nojs.parentElement.removeChild(nojs);
    } catch(error) {
        nojs.innerText = "You have JavaScript enabled, but are missing required functionality!";
        console.error("The browser does not support constant variables!");
    }
    
});


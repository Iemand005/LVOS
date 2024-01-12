const citatesContainer = document.getElementById("citates");
const citateStore = "citates";

function injectCitate(citate, form){
    storeCitate(citate);
    if(form == null) form = document.querySelector("form");
    let result = "Success!";
    try{
        console.log(citate);
        //Reguliere expressie met i om ook hoofdletters te detekteren. && in plaats van & zorgt ervoor dat de statement niet beide nakijkt als een vals aangeeft.
        if (!/[a-z]/.test(citate.title)) throw {message: "Titel is niet ingevult!"};
        if (!/[a-z]/.test(citate.message)) throw {message: "Bericht is niet ingevult!"};
        const citateTemplateTag = citatesContainer.getElementsByTagName("template")[0];
        
        let citateTemplate;

        if (citateTemplateTag.content != null) citateTemplate = citateTemplateTag.content.children[0];
        else citateTemplate = citateTemplateTag.children[0]; // Voor Internet Explorer!
        
        citateElement = citateTemplate.cloneNode(true);
        citateElement.querySelector("cite").innerText = citate.title;
        citateElement.querySelector("blockquote").innerText = citate.message;
        citateElement.querySelector("figcaption").insertAdjacentText('beforeend', "- " + citate.author);
        citatesContainer.appendChild(citateElement);
    }
    catch(error){
        console.error(error.message);
        result = "Mislukt! " +  error.message;
    }
    output = form.querySelector("output");
    output.value = result;
    output.innerText = result;
}

// Arrow notatie zou er zo uit zien. Deze kan ik niet gebruiken als ik IE11 wil ondersteunen.
//document.addEventListener("submit", event=>event.preventDefault());

document.addEventListener("submit", function(event){
    event.preventDefault();
});

function createCitate(title, message, author){
    return {title, message, author}; // I can't get classes to work in IE11 so I will use regular objects.
}

function submitCitate(form){
    const citate = createCitate(form.title.value, form.message.value, form.author.value);
    injectCitate(form.title.value, form.message.value, form.author.value, form);
    const citates = JSON.parse(localStorage.getItem(citateStore)) || new Array();
    citates.push(citate);
    localStorage.setItem(citateStore, JSON.stringify(citates));

}

function removeDuplicateCitates(citates){
    return [...new Map(citates.map(function(citate){return [citate.message, citate]})).values()];
}

function storeCitate(citate){
    console.log(citate.message)
    if(!citates.map(function(citate){return citate.message}).includes(citate.message)) citates.push(citate);
    localStorage.setItem(citateStore, JSON.stringify(citates));
}

function loadCitates(){
    try{
        const citates = JSON.parse(localStorage.getItem(citateStore)) || new Array();
        JSON.stringify(citates);
        //citates = removeDuplicateCitates(citates);
        return citates;
    }
    catch{
        return new Array();
    }
}

const citates = loadCitates();

democitate = new Citate("Geert", "Geert eet graag beren", "Lasse")
injectCitate(democitate)

function injectCitates(citates){
    citates.forEach(function(citate){
        injectCitate(citate);
    });
}
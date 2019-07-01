var baseURL = decodeURIComponent(window.parent.location.toString()); //Gets Current URL. This is used to get the project/component URI

subfolderHistory = [];
artifactTitles = [];
levels = [];
folderDepth = [];
type = [];
moduleList = [];
moduleURIArray = [];
var count = 0;
var queryCapability;
ArtifactsArray = [];
trueFalseArray = [];

var queryForQueryCapabilityAPI = "&oslc.prefix=oslc=<http://open-services.net/ns/core%23>&oslc.prefix=dcterms=<http://purl.org/dc/terms/>&oslc.prefix=nav=<http://com.ibm.rdm/navigation%23>&oslc.where=nav:parent=";
//The queryForQueryCapabilityAPI is the string that goes after the query capability API to search the requirements INSIDE a folder.
sheet = [["Name","Depth Level", "Type"]];

number = baseURL.search("componentURI="); //Slices the current URL to get the project URI (defined by componentURI in the url)
    var componentURI = baseURL.slice(number);
    number2 = componentURI.search("/rm/rm-projects/");
    componentURI = componentURI.slice(number2);
    //console.log(componentURI);
    componentURI = componentURI.slice(16);
    number3 = componentURI.search("/");
    componentURI = componentURI.slice(0,number3);

var hostname = window.parent.location.protocol +'//'+ window.parent.location.hostname+(window.parent.location.port ? ':'+ window.parent.location.port: '');
//hostname gets the hostname of the url and port. NOTE: The parent attribute is necessary to scope outside of the widget window

var resourceApi = hostname + "/rm/publish/resources?resourceURI=";

var modulesURL = hostname + "/rm/publish/modules?projectURI=" + componentURI;


$("#btn").on("click",function(){
    $("#loader").show();
    setTimeout(servicesCall,1000);
});
function servicesCall(){
    servicesURL = hostname + "/rm/oslc_rm/" + componentURI + "/services.xml";
    $.ajax({
        url: servicesURL, //Access the services xml for the selected RM project
        processdata: false,
        async: false,
        //need these headers for ajax and rest/oslc
        headers:{
            "OSLC-Core-Version":"2.0",
            "Accept":"application/xml"
        },
        error: function(){
            
            $("#updates").text("Error retrieving Apis..");
        }
      }).done(function(xml){
        queryCapabilityApi(xml.getElementsByTagName("oslc:queryCapability"));
        array(xml.getElementsByTagName("oslc:queryCapability"));
        createAndDownload();
        $("#loader").hide();
        //alert("Download Finished!");
      })
}

function queryCapabilityApi(array){
    $.each(array, function(i, item){
        
        //console.log(item);
        if($.trim(array[i].textContent.toString()) == "Query Capability"){
            queryCapability = array[i].getElementsByTagName("oslc:queryBase")[0].getAttribute("rdf:resource"); 
        }
    })
}


function array(array){ //Gets the Folder Query API
    
    var info = [];
    $.each(array, function(i, item){
        
        //console.log(item);
        if($.trim(array[i].textContent.toString()) == "Folder Query Capability"){
            rootFolderUrl = array[i].getElementsByTagName("oslc:queryBase")[0]; 
            rootFolderAPI(rootFolderUrl.getAttribute("rdf:resource"));//Gets the API that searches for folder root 
        }
    })
    
 }

 function rootFolderAPI(rootFolder){
    $.ajax({
        url: rootFolder, //Access the Folder API
        processdata: false,
        async: false,
        //need these headers for ajax and rest/oslc
        headers:{
            "OSLC-Core-Version":"2.0",
            "Accept":"application/xml"
        },
        error: function(){
            
            $("#updates").text("Error retrieving Apis..");
        }
      }).done(function(xml){
        //console.log(xml);
        xmlArray = xml.getElementsByTagName("nav:folder"); // Get folder tags
        

        $.each(xmlArray, function(i, item){
            subFolderURL = xmlArray[i].getElementsByTagName("nav:subfolders")[0].getAttribute("rdf:resource"); //Get subfolder URL
            rootFolderText = $.trim(xmlArray[i].textContent); //Folder tags have text that defines the name of the folder
            //console.log(rootFolderText);
            //console.log(subFolderURL);

        })
        depth =1;
        getAllModules();
        recursion(subFolderURL, depth);
      })


}

function recursion(subFolderURL, depth){
    if(Array.isArray(subFolderURL)){ //From root folder 'subFolderURL' is not an array
        subFolderURL = subFolderURL[0]; //Gets element 0 from the received array 
        subfolderHistory.shift(); //DELETES element 0 from the array since I used it
        depth = levels[0] + 1; //Each recursion means I found a subfolder, hence im a level deper
        levels.shift();//Delete the element 0 used in the math above to keep track of current folder depth
        if(subFolderURL === undefined){
            return; //Possible roadblock, just return.
        }
    }
    
    $.ajax({
        url: subFolderURL, //Access the Folder API
        processdata: false,
        async: false,
        //need these headers for ajax and rest/oslc
        headers:{
            "OSLC-Core-Version":"2.0",
            "Accept":"application/xml"
        },
        error: function(){
            
            $("#updates").text("Error retrieving Apis..");
        }
      }).done(function(xml){
          //console.log(xml);
            folderList = xml.getElementsByTagName("nav:Description"); //Trim down the xml a bit
            foldersXMLArray = folderList[0].getElementsByTagName("rdfs:member"); //Will contain an array of all the xml elements that have a subfolder
        if(foldersXMLArray[0] === undefined){
            depth = depth - 1; //Possible road block. Means I found no subfolder so I should go back one level 
        }else{
                $.each(foldersXMLArray, function(i, item){ //For each subfolder found on that array
                    if(foldersXMLArray[i] === undefined){ //Possible road block. Means I found no subfolder so I should go back one level
                        depth = depth - 1;
    
                    }else{
                        FolderTitle = $.trim(foldersXMLArray[i].textContent);//Get the folder title and trim any whitespace and endlines
                        artifactTitles.push(FolderTitle);//Push the folder title into the artifactTitles array
                        urlToSubFolder = foldersXMLArray[i].getElementsByTagName("nav:subfolders")[0].getAttribute("rdf:resource");//Gets the URL to the next subfolder
                        subfolderHistory.push(urlToSubFolder);//adds that URL into an array
                        levels.push(depth); //Levels array is simply a dummy array that I use to keep track of the depth
                        //console.log(FolderTitle + "---->" + depth);
                        folderDepth.push(depth); //FolderDepth will contain the depth of the folder. This array should be in sync with the folder titles array
                        type.push("Folder");
                        folderURL = foldersXMLArray[i].getElementsByTagName("nav:folder")[0].getAttribute("rdf:about");
                        getAllArtifacts(folderURL,depth); //Sends the folder URL to extract all the artifacts in it.
                        
                    }
                })
        
        }
            recursion(subfolderHistory, depth); //When the loop is done call itself and sends the URL array with the current depth
    })
}

function createAndDownload(){
    console.log(trueFalseArray);
    for (i = 0; i < artifactTitles.length; i++) { 
        //console.log(artifactTitles[i] + "----->" + folderDepth[i]);
        sheet.push([artifactTitles[i], folderDepth[i], type[i]]);
        for(n = 0; n < moduleList.length; n++){
            if(type[i] == "Folder" || type[i] == "Module"){
                sheet[i+1].push("N/A"); 
            }else{
                sheet[i+1].push(trueFalseArray.shift());
            }
        }
      }
      downloadXlsx( [ sheet ], [ "ProjectStructure" ]);
      //console.log(sheet);
}

function downloadXlsx(sheetArrays, sheetNames){
    var wb = new Workbook();
    for (var i=0;i<sheetArrays.length;i++) {
      var ws = sheet_from_array_of_arrays(sheetArrays[i]);
      wb.SheetNames.push(sheetNames[i]);
      wb.Sheets[sheetNames[i]] = ws;
    }
  
      var wopts = { bookType:'xlsx', bookSST:false, type:'binary' };
      var wbout = XLSX.write(wb,wopts);
      var fileName = "ProjectStructure.xlsx";
      saveAs(new Blob([s2ab(wbout)],{type:""}), fileName);
      $("#updates").text("Download Finished!");
}

function getAllModules(){
    $.ajax({
        url: modulesURL, //Access the Folder API
        processdata: false,
        async: false,
        //need these headers for ajax and rest/oslc
        headers:{
            "OSLC-Core-Version":"2.0",
            "Accept":"application/xml"
        },
        error: function(){
            
            $("#updates").text("Error retrieving Apis..");
        }
      }).done(function(xml){
        xmlArray = xml.getElementsByTagName("ds:artifact"); // Get Modules tags
        
        $.each(xmlArray, function(i, item){
            moduleList.push($.trim(xmlArray[i].getElementsByTagName("rrm:title")[0].textContent.toString()));
            moduleURIArray.push(xmlArray[i].getAttribute("attribute:itemId"));            
        })
        for (var i=0;i<moduleList.length;i++) {
            var string = moduleList[i];
            sheet[0].push(string);
        }
      })
}

function getAllArtifacts(folderURL,depth){ 
    
    fullFolderArtifactsUrl = queryCapability + queryForQueryCapabilityAPI + "<" + folderURL + ">";
    $.ajax({
        url: fullFolderArtifactsUrl, 
        processdata: false,
        async: false,
        //need these headers for ajax and rest/oslc
        headers:{
            "OSLC-Core-Version":"2.0",
            "Accept":"application/xml"
        },
        error: function(){
            $("#updates").text("Error retrieving Apis..");
        }
      }).done(function(xml){
        xmlArray = xml.getElementsByTagName("oslc_rm:Requirement"); //Get the tags that contains the req. URL
        if(xmlArray === undefined){
            
        }else{
            //console.log(xmlArray);
            $.each(xmlArray, function(i, item){
                
                ArtifactsArray.push(xmlArray[i].getAttribute("rdf:about").toString());
            })
           

             for(var i=0;i<ArtifactsArray.length;i++){
                getArtifact(ArtifactsArray[i],depth);
                getArtifactType(ArtifactsArray[i]);
             }
             ArtifactsArray = [];
        }
       
      })
}

function getArtifact(artifactURL, depth){
    
    $.ajax({
        url: artifactURL, 
        processdata: false,
        async: false,
        //need these headers for ajax and rest/oslc
        headers:{
            "OSLC-Core-Version":"2.0",
            "Accept":"application/xml"
        },
        error: function(){
            
            $("#updates").text("Error retrieving Apis..");
        }
      }).done(function(xml){
        
        if (typeof xml === 'string' || xml instanceof String) //roadblock
        {
           return; 
        }
        //console.log(xml);
        xmlArray = xml.getElementsByTagName("oslc_rm:Requirement"); //Get the tags that contains the req. URL
        if(xmlArray === undefined){
            return;
        }
       
        $.each(xmlArray, function(i, item){
            if(xmlArray[i] === undefined){
                return;
            }
            //console.log(xmlArray);
            //ArtifactType = xmlArray[i].getElementsByTagName("rdf:type")[0].getAttribute("rdf:resource");
            //ArtifactType = ArtifactType.substring(ArtifactType.indexOf("#") + 1);
            ArtifactTitle = xmlArray[i].getElementsByTagName("dcterms:title")[0].textContent;
            
            //console.log(ArtifactType);
            artifactTitles.push(ArtifactTitle);
            folderDepth.push(depth + 1);
            
        })
      })
}

function getArtifactType(artifactURL){
    num1 = artifactURL.search("/rm/resources/");
    artifactURI = artifactURL.slice(num1);
    artifactURI = artifactURI.slice(14);
    
    resourceApi2 = resourceApi + artifactURI;

    $.ajax({
        url: resourceApi2, 
        processdata: false,
        async: false,
        //need these headers for ajax and rest/oslc
        headers:{
            "OSLC-Core-Version":"2.0",
            "Accept":"application/xml"
        },
        error: function(){
            
            $("#updates").text("Error retrieving Apis..");
        }
      }).done(function(xml){
       xmlArray = xml.getElementsByTagName("attribute:objectType");
        $.each(xmlArray, function(i, item){
            artiType = xmlArray[i].getAttribute("attribute:name");
            type.push(artiType);
            //console.log(artiType);
        })
        //return artiType;
      })
      //console.log("HE");
      checkIfArtifactIsInAModule(artifactURI);
}

function checkIfArtifactIsInAModule(artifactURI){
    flag = false;
    $.each(moduleURIArray, function(i, item){
        URLi = resourceApi + moduleURIArray[i];
        $.ajax({
            url: URLi, 
            processdata: false,
            async: false,
            //need these headers for ajax and rest/oslc
            headers:{
                "OSLC-Core-Version":"2.0",
                "Accept":"application/xml"
            },
            error: function(){
                $("#updates").text("Error retrieving Apis..");
            }
          }).done(function(xml){
           xmlArray = xml.getElementsByTagName("rrm:contextBinding");
            $.each(xmlArray, function(i, item){
               uriInModules = xmlArray[i].getElementsByTagName("rrm:core")[0].textContent;
               if(artifactURI == uriInModules){ 
                trueFalseArray.push("True");
                console.log("true");
                flag = true;
                return false;
                }
            })
            if(!flag){
                trueFalseArray.push("False");
            }
            flag = false;
          })
    })
}

Dim ie, fso, folder

Set ie = CreateObject("InternetExplorer.Application")
Set fso = CreateObject("Scripting.FileSystemObect")
Set folder = fso.GetParentFolderName(WScript.ScriptFullName)
ie.Navigate "./index.html"
ie.Visible = true

WScript.Echo ie
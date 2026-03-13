Dim ie, fso, folder, url

Set ie = CreateObject("InternetExplorer.Application")
Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
url = "file:///" & Replace(folder & "\index.html", "\", "/")
ie.Navigate url
ie.Visible = true
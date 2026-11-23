param([Parameter(Mandatory=$true)][string]$Executable,[string]$Name='Milo Maroon')
$ErrorActionPreference='Stop'
if(-not('MiloScreenSaverResource' -as [type])){
Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
public static class MiloScreenSaverResource {
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr BeginUpdateResource(string file,bool deleteExisting);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool UpdateResource(IntPtr handle,IntPtr type,IntPtr name,ushort language,byte[] data,uint size);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool EndUpdateResource(IntPtr handle,bool discard);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr LoadLibraryEx(string file,IntPtr reserved,uint flags);
 [DllImport("kernel32.dll")] static extern bool FreeLibrary(IntPtr module);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int LoadString(IntPtr module,uint id,StringBuilder text,int size);
 public static void Write(string file,string name) {
  // STRINGTABLE block 1 holds strings 0..15; string ordinal 1 is the
  // screen saver name required by the Windows Screen Saver Control Panel.
  byte[] data;
  using(var stream=new MemoryStream())using(var writer=new BinaryWriter(stream,Encoding.Unicode)) {
   for(int i=0;i<16;i++){string s=i==1?name:"";writer.Write((ushort)s.Length);writer.Write(Encoding.Unicode.GetBytes(s));}
   data=stream.ToArray();
  }
  IntPtr h=BeginUpdateResource(file,false);if(h==IntPtr.Zero)throw new Win32Exception();bool complete=false;
  try{if(!UpdateResource(h,(IntPtr)6,(IntPtr)1,1033,data,(uint)data.Length))throw new Win32Exception();if(!EndUpdateResource(h,false))throw new Win32Exception();complete=true;}
  finally{if(!complete)EndUpdateResource(h,true);}
 }
 public static string Read(string file) {
  IntPtr h=LoadLibraryEx(file,IntPtr.Zero,0x22);if(h==IntPtr.Zero)throw new Win32Exception();
  try{var text=new StringBuilder(512);return LoadString(h,1,text,text.Capacity)>0?text.ToString():"";}finally{FreeLibrary(h);}
 }
}
'@
}
$file=(Resolve-Path -LiteralPath $Executable).Path
[MiloScreenSaverResource]::Write($file,$Name)
if([MiloScreenSaverResource]::Read($file) -ne $Name){throw 'Screen saver name resource verification failed.'}
Write-Host ('Windows screensaver name verified: '+$Name)

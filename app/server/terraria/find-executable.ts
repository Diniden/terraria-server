import path from "path";
import Platform from 'platform-detect/os.mjs';
import shell from "shelljs";

/**
 * Finds and prepares the executables for the terraria server.
 */
export function findExecutable() {
  let serverStartScriptPath = '';
  let os = '';
  let serverExecutables = [];

  // First we determine which operating system we're on.
  if (Platform.macos) os = 'mac';
  if (Platform.windows) os = 'windows';
  if (Platform.linux) os = 'linux';

  // Make sure our start script and executables are truly executable
  switch (os) {
    case 'mac': {
      serverStartScriptPath = path.resolve("binary/Mac/TerrariaServer.app/Contents/MacOS/TerrariaServer");
      serverExecutables = [path.resolve("binary/Mac/TerrariaServer.app/Contents/MacOS/TerrariaServer.bin.osx")];
      break;
    }

    case 'linux': {
      serverStartScriptPath = path.resolve("binary/Linux/TerrariaServer");
      serverExecutables = [
        path.resolve(`binary/Linux/TerrariaServer.bin.x86_64`),
        path.resolve(`binary/Linux/TerrariaServer.bin.x86`),
      ];
      break;
    }

    case 'windows': {
      serverStartScriptPath = path.resolve("binary/Windows/start-server.bat");
      serverExecutables = [path.resolve(`binary/Windows/TerrariaServer.exe`)];
      break;
    }

    default: {
      console.warn(
        'It appears your platform is not windows, linux, or macos, which means its not supported'
      );
      process.exit(1);
    }
  }

  // Make sure our execution files are executable
  shell.chmod('755', serverStartScriptPath);
  serverExecutables.forEach(exe => shell.chmod('755', exe));

  return {
    os,
    serverStartScriptPath,
    serverExecutables
  };
}

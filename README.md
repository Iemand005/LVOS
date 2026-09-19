# VulpOS

VulpOS is a web-based operating system and desktop environment built entirely with web technologies.

It runs as a desktop inside the browser, with its own window manager, applications, games, system UI and mobile interface. It is designed to be lightweight and fast while still taking advantage of modern browser features when they are available.

One of the unusual parts of VulpOS is its browser support. The project is designed to work across several generations of the web, with versions targeting modern browsers as well as Internet Explorer, Netscape and Opera Presto.


[Open on Desktop](https://iemand005.github.io/LVOS)
[Mobile version](https://iemand005.github.io/LVOS/mobile.html)


Netscape 6-9, Opera Presto (12.18): [Open](https://iemand005.github.io/LVOS/indexIE8.html)
Netscape 4: [Open](https://iemand005.github.io/LVOS/indexNS4.html) (Not finished)

Supports TypeScript 3-6

TODO:

mobile launchpad (without windowmgr?)
uh
- view transitipn api opening app from uh aunchpad
- default appicon (letter as ion the icomn?)
wallpaper share between desktop and mobile uh

custom back fwd handling to nav the apps in iframe maybe?
- share d uh pagination/ tab control fo r launcpad, geodetahbs and frzona

lunchpd stylingz omg I need a blw overlay liie macos had and like hide the windows hehind t and then a win10 fullscreen style version design as well and hovbou live tiles



## Try VulpOS

**Desktop**

https://iemand005.github.io/LVOS/

**Mobile**

https://iemand005.github.io/LVOS/mobile.html

**Netscape 6–9 / Opera Presto**

https://iemand005.github.io/LVOS/indexN.html

**Netscape 4**

https://iemand005.github.io/LVOS/indexNS4.html

The Netscape 4 version is still unfinished.

## What is VulpOS?

VulpOS treats the browser more like an operating-system platform than a traditional website.

Instead of navigating between pages, you work inside a desktop environment. Applications open in windows and are managed by the VulpOS window manager. The system has its own applications, games, launch interfaces and supporting APIs.

The project also has a separate mobile interface. Mobile devices are not simply shown a scaled-down version of the desktop; VulpOS has a mobile-oriented interface and application layout.

The goal is to keep the system lightweight without giving up the feeling of using an actual desktop environment.

## Browser support

VulpOS has been developed with a much wider browser range in mind than most modern web applications.

The project includes support for:

* Chrome
* Firefox
* Microsoft Edge
* Internet Explorer
* Netscape 6–9
* Opera Presto
* Netscape 4

Modern browsers get the full modern implementation and can use newer web APIs. Older browsers use compatibility-focused builds and code paths.

The codebase also maintains compatibility with older JavaScript environments, including ES5-era browsers.

## Applications

VulpOS is built around applications rather than individual web pages.

Applications live inside the `Applications` directory and can use the VulpOS environment to create windows, interact with the desktop and provide their own interfaces.

The system is intended to make applications feel like parts of one operating system rather than unrelated websites running next to each other.

## Games

VulpOS also includes browser games in its `Games` directory.

Games are treated as applications within the VulpOS environment and can run inside the same desktop system.

## Mobile

VulpOS has a dedicated mobile entry point:

```text
mobile.html
```

The mobile version uses a different interface designed for touch screens and smaller displays rather than simply shrinking the desktop window manager.

## Legacy browser support

Supporting old browsers is a significant part of the project.

VulpOS contains separate entry points for different generations of browsers because the capabilities of a browser such as Netscape 4 are fundamentally different from those of a current Chromium or Firefox release.

This makes the project partly an experiment in progressive enhancement and browser compatibility: the same basic idea of a web desktop is implemented across technologies that are separated by decades.

The legacy versions are not just screenshots or static mockups. They are separate implementations designed around the limitations of their target browsers.

## Modern web APIs

Although VulpOS supports old browsers, the modern version is not restricted to the lowest common denominator.

When running in a modern browser, VulpOS can use newer browser features and APIs where appropriate.

This gives the project two different goals that normally do not go together:

* Keep the system usable on very old browsers.
* Make use of modern browser capabilities when they are available.

## TypeScript

The project supports TypeScript versions 3 through 6.

The source code contains both TypeScript and JavaScript, with the build system producing browser-ready output for the different VulpOS targets.

Older browser builds can therefore use compatibility-oriented JavaScript while the modern codebase can continue to use newer development tooling.

## Project structure

```text
VulpOS/
├── Applications/    VulpOS applications
├── Assets/          Images, icons and other assets
├── Extension/       Extension support
├── Games/           Games
├── Scripts/         Core JavaScript and TypeScript
├── Styles/          System and application styles
├── LVOS-dist/       Built distribution
├── build.js         Build system
├── index.html       Main desktop
├── mobile.html      Mobile version
├── indexIE8.html    Internet Explorer version
├── indexN4.html     Netscape 4 version
├── indexNS4.html    Netscape legacy version
└── manifest.json    Web application manifest
```

## Building

Clone the repository and install the dependencies:

```powershell
git clone https://github.com/Iemand005/LVOS.git
cd LVOS
npm install
```

Build VulpOS with:

```powershell
npm run build
```

For development builds:

```powershell
npm run build:dev
```

The generated files are placed in the distribution directory used by the project.

## Development

VulpOS is developed as a long-running project rather than as a single framework or demo.

The repository contains the operating-system layer, applications, games, styles, assets, compatibility code and build tooling together so that the different parts of the system can evolve alongside each other.

The project is intentionally lightweight and avoids making a large frontend framework a requirement for the entire desktop.

## Why build a web OS?

Browsers have become capable of running applications that would traditionally require a desktop application, while remaining portable across operating systems.

VulpOS explores what happens when the browser itself becomes the environment.

At the same time, the project looks at the other end of the web's history. Supporting browsers such as Internet Explorer, Netscape and Opera Presto makes it possible to see how far the same concept can be taken across very different generations of browser technology.

VulpOS is therefore both a usable web desktop and an ongoing experiment in browser-based operating systems, progressive enhancement and long-term web compatibility.

## Status

VulpOS is actively developed.

The modern desktop is the primary version of the project. The mobile interface and legacy browser versions are developed alongside it, with some parts still unfinished.

Netscape 4 support is currently a work in progress.

## Repository

https://github.com/Iemand005/LVOS

## License

See the repository for licensing information.

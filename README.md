# Scan project manager
Help you and your team with the management of projects in a scan trad team of manga/manhwa/etc.

Contains:
- Creation of a project (manhwa)
- Manage different templates (teams with specific roles)
- People who work on tasks see all of them in a menu
- Get notified when a chapter is done or the project is inactive for a week
- Have a stat system to know which one has done the most chapters
- In the menu, there is a help button that explains all the things
- There is a complete tutorial using /faq command

## Development
### Prerequisites
- Node.js
- npm
- Discord bot token

### Installation
1. Clone the repository
```bash
git clone https://github.com/Tryliom/Scan-project-manager.git
```
2. Install dependencies
```bash
npm install
```
3. You need to duplicate the `.env.example` file and rename it to `.env`.
   Then, fill in the required fields.
4. You need to create the folder `./assets/` with the following structure:
```
assets
├── backup
├── data
```

### Start the bot
```bash
npm start
```
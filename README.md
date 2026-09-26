# stuporbowl.org

## How this app works

stuporbowl.org is a full stack project with many layers. The tech stack is as follows:

- Astro
  - Front End Framework
  - Static Site Generator
- Node
  - Back End
- Express
  - Server
- MySQL
  - Relational Database
  - For admin authentication, racer registration and news updates
- SQLite
  - Relational Database
  - For storing photo EXIF and GPS data

## SQLite

The images.db file is created at build time by a bash script that looks in the public/images directory and extracts all the images with a "DateTimeOriginal" EXIF data entry. This allows us to query an api endpoint and request each photo's EXIF and GPS data individually when needed, instead of frontloading it superflously.

The reason for a separate database from the auth and registration database is that we expect to have a significant amount of racer submitted photos over the years and we wish to preserve this data. There may be ballooning MySQL fees from our platform provider if this is the case, so we are choosing to build a static database at build time. This information does not need to be dynamic, but it does need to be available quickly when queried.

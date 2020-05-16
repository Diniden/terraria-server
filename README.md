# Terraria Server Manager

This is a simple manager that helps you monitor and control terraria world instances remotely.

It provides a web interface that will deploy itself on normal http and https protocols where
you can specify a password that priviliedged users can utilize to manage adding and removing
worlds.

Users can easily add worlds up to a configurable max number and then delete them using the
interface.

You MUST know the world's password in order to remove an active world. World's never get
deleted, they just get removed from being active. Only a server administrator can run the
normal server scripts to run delete operations.

This is EXTREMELY lightweight. I did NOT have a lot of time to make this super feature rich
before Journey's End was released and I wanted a minimal implementation that I could trust and
run on my hom network without fearing third party scripts and junk from doing anything
nefarious.

---

## Using

WINDOWS USERS: Download and update your .NET framework and XNA framework (ONLY DOWNLOAD FROM OFFICIAL MICROSOFT WEBSITES. BE CAREFUL ABOUT THAT!!!)

- Clone this repo.
- Have the latest NodeJS install
- Open a terminal and make sure your current working directory is the project you just cloned
- run this:

```shell
npm i
```

- then this:

```shell
npm start
```

## POWAH USERS

There's some config because we all like config.

`.serverrc`

Open that and use the commentry to figure out what my arbitrarily named properties mean and do.
Good luck!

## Disclaimer

I am in no way affiliated with the makers of Terraria, nor do I own any of the products of Terraria.

This project is not here to make money, nor is it intended to reflect any intentions of the owners
of the Terraria brand and name.

This is merely a little passion project so I can have a convenient way of spinning up worlds on my
home tower and not have to run to my office whenever someone needs their world up and running.

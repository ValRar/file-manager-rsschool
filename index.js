import { homedir } from "os";
import path from "path";
import { opendir, createReadStream, writeFile, rename, createWriteStream, unlink } from "fs";
import os from "os"
import { createHash } from "crypto";
import { createBrotliCompress, createBrotliDecompress } from "zlib";
import { pipeline } from "stream";

let currentDir = homedir()

function init() {
    const username = process.argv.filter(arg => /^--name/.test(arg))[0].split("=")[1]
    console.log(`Welcome to the File Manager, ${username}!`);
    console.log(`You are currently in ${currentDir}`);
    process.on("exit", () => {
        console.log(`Thank you for using File Manager, ${username}, goodbye!`)
    })
    process.on("SIGINT", () => {
        console.log(`Thank you for using File Manager, ${username}, goodbye!`)
        process.exit()
    })
    process.stdin.on("data", (data) => {
        resolveInput(data.toString().trim())
    })
}

function resolveInput(input) {
    const argv = input.split(" ")
    const commandName = argv[0]
    argv.shift()
    switch (commandName) {
        case "up":
            up()
            break
        case "cd":
            changeDirectory(argv)
            break
        case "ls":
            list()
            break
        case "cat":
            cat(argv)
            break
        case "add":
            addFile(argv)
            break
        case "rn":
            renameFile(argv)
            break
        case "cp":
            fileCopy(argv)
            break 
        case "mv":
            moveFile(argv)
            break
        case "rm":
            removeFile(argv)
            break
        case "os":
            osHandler(argv)
            break
        case "hash":
            calcHash(argv)
            break
        case "compress":
            compressFile(argv)
            break
        case "decompress":
            decompressFile(argv)
            break
        case ".exit":
            process.exit()
        default: 
            console.log("Invalid input") 
            break
    }
    console.log(`You are currently in ${currentDir}`);
}

function up() {
    if (!/^[A-Z]:\/$/.test(currentDir)) {
        currentDir = path.join(currentDir, "..")
    }
}

function changeDirectory(argv) {
    if (argv[0]) {
        currentDir = path.resolve(currentDir, argv[0])
        return
    }
    console.log("Invalid input")
}
function list() {
    const data = []
    opendir(currentDir, async (err, dir) => {
        if (err) {
            console.log("Operation failed")
            return
        }
        for await (const dirEnt of dir) {
            if (dirEnt.isFile()) data.push({ name: dirEnt.name, type: "file" })
            else data.push({ name: dirEnt.name, type: "folder" })
        }
        renderTable(data)
    })
}

function renderTable(data) {
    let maxNameLength = 0
    const maxIndexLength = data.length.toString().length
    data.map(entity => {
        if (entity.name.length > maxNameLength) maxNameLength = entity.name.length
    })
    console.log("+" + "-".repeat(maxIndexLength) + "+" + "-".repeat(maxNameLength) + "+" + "-".repeat(6) + "+")
    data.map((entity, index) => {
        const indexSpaces = (maxIndexLength - index.toString().length) / 2
        const nameSpaces = (maxNameLength - entity.name.length) / 2
        const typeSpaces = entity.type === "folder" ? 0 : 1
        let str = "|" + " ".repeat(indexSpaces) + index + " ".repeat(Math.ceil(indexSpaces)) + "|"
        str += " ".repeat(nameSpaces) + entity.name + " ".repeat(Math.ceil(nameSpaces)) + "|" + " ".repeat(typeSpaces) + entity.type + " ".repeat(typeSpaces) + "|"
        console.log(str)
    })
    console.log("+" + "-".repeat(maxIndexLength) + "+" + "-".repeat(maxNameLength) + "+" + "-".repeat(6) + "+")
}

function cat(argv) {
    if (!argv[0]) {
        console.log("Invalid input")
        return
    }
    const pathToFile = path.resolve(currentDir, argv[0])
    const readableStream = createReadStream(pathToFile)
    readableStream.pipe(process.stdout)
    readableStream.on("error", (_) => {
        console.log("Operation failed")
    })
    console.log("\n")
}

function addFile(argv) {
    if (!argv[0]) {
        console.log("Invalid input")
        return
    }
    writeFile(path.resolve(currentDir, argv[0]), "", err => {
        if (err) console.log("Operation failed")
    })
}

function renameFile(argv) {
    if (!argv[0] || !argv[1]) {
        console.log("Invalid input")
        return
    }
    const oldPath = path.resolve(currentDir, argv[0])
    const newPath = path.resolve(currentDir, argv[1])

    rename(oldPath, newPath, (err) => {
        if (err) console.log("Operation failed")
    })
}

function fileCopy(argv) {
    if (!argv[0] || !argv[1]) {
        console.log("Invalid input")
        return
    }
    const oldFile = path.resolve(currentDir, argv[0])
    const newFile = path.resolve(currentDir, argv[1])
    const writeStream = createWriteStream(newFile)
    const readStream = createReadStream(oldFile)
    readStream.pipe(writeStream)
    readStream.on("error", (_) => {
        console.log("Operation failed")
    })
    writeStream.on("error", (_) => {
        console.log("Operation failed")
    })
}

function moveFile(argv) {
    if (!argv[0] || !argv[1]) {
        console.log("Invalid input")
        return
    }
    const oldFile = path.resolve(currentDir, argv[0])
    const newFile = path.resolve(currentDir, argv[1])
    const writeStream = createWriteStream(newFile)
    const readStream = createReadStream(oldFile)
    readStream.pipe(writeStream)
    readStream.on("error", (_) => {
        console.log("Operation failed")
    })
    writeStream.on("error", (_) => {
        console.log("Operation failed")
    })
    unlink(oldFile, (err) => {
        if (err) console.log("Operation failed")
    })
}

function removeFile(argv) {
    if (!argv[0]) {
        console.log("Invalid input")
        return
    }
    const filePath = path.resolve(currentDir, argv[0])
    unlink(filePath, (err) => {
        if (err) console.log("Operation failed")
    })
}

function osHandler(argv) {
    switch (argv[0]) {
        case "--EOL":
            console.log(os.EOL)
            break
        case "--cpus":
            console.log(os.cpus())
            break
        case "--homedir":
            console.log(os.homedir())
            break
        case "--username":
            console.log(os.userInfo().username)
            break
        case "--architecture":
            console.log(os.arch())
        default:
            console.log("Invalid input")
            break
    }
}

function calcHash(argv) {
    if (!argv[0]) {
        console.log("Invalid input")
        return
    }
    const filePath = path.resolve(currentDir, argv[0])
    const readStream = createReadStream(filePath)
    const hash = createHash("sha256")
    readStream.pipe(hash)
    readStream.on("error", (_) => {
        console.log("Operation failed")
    })
    hash.on("error", (_) => {
        console.log("Operation failed")
    })
    console.log(hash.digest("hex"))
}

function compressFile(argv) {
    if (!argv[0] || !argv[1]) {
        console.log("Invalid input")
        return
    }
    const oldFile = path.resolve(currentDir, argv[0])
    const newFile = path.resolve(currentDir, argv[1])
    const readableStream = createReadStream(oldFile)
    const brotliCompress = createBrotliCompress()
    const writeStream = createWriteStream(newFile)
    pipeline(readableStream, brotliCompress, writeStream, (err) => {
        if (err) console.log("Operation failed")
    })
}

function decompressFile(argv) {
    if (!argv[0] || !argv[1]) {
        console.log("Invalid input")
        return
    }
    const oldFile = path.resolve(currentDir, argv[0])
    const newFile = path.resolve(currentDir, argv[1])
    const readableStream = createReadStream(oldFile)
    const brotliDecompress = createBrotliDecompress()
    const writeStream = createWriteStream(newFile)
    pipeline(readableStream, brotliDecompress, writeStream, (err) => {
        if (err) console.log("Operation failed")
    })
}

init()
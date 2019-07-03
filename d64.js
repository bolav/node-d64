// http://unusedino.de/ec64/technical/formats/d64.html
const fs = require('fs');

const sectors = [
    0,
    21, // 1
    21, // 2
    21, // 3
    21, // 4
    21, // 5
    21, // 6
    21, // 7
    21, // 8
    21, // 9
    21, // 10
    21, // 11
    21, // 12
    21, // 13
    21, // 14
    21, // 15
    21, // 16
    21, // 17
    19, // 18
    19, // 19
    19, // 20
    19, // 21
    19, // 22
    19, // 23
    19, // 24
    18, // 25
    18, // 26
    18, // 27
    18, // 28
    18, // 29
    18, // 30
    17, // 31
    17, // 32
    17, // 33
    17, // 34
    17, // 35
    17, // 36
    17, // 37
    17, // 38
    17, // 39
    17, // 40
]

function get_offset(track, sector) {
    let offset = 0;
    for (let i=0;i<track;i++) {
        offset += sectors[i];
    }
    offset += sector;
    return offset * 256;
}

function get_sector(disk, track, sector) {
    const offset = get_offset(track, sector);
    return disk.slice(offset, offset + 256);
}

function fn_trim(s) {
    for (let i=s.length-1;i>0;i--) {
        if (s.charCodeAt(i) !== 65533) {
            return s.substring(0, i+1);
        }
    }
}

function FileEntry(dir_entry) {
    this.t_link = dir_entry[0];
    this.s_link = dir_entry[1];
    this.file_type = dir_entry[2];
    this.t_first_sector = dir_entry[3];
    this.s_first_sector = dir_entry[4];
    this.filename = fn_trim(dir_entry.slice(5,0x15).toString());
    this.t_first_side_sector = dir_entry[0x15];
    this.t_first_side_track = dir_entry[0x16];
    this.rel_file_record_length = dir_entry[0x17];
    this.unused = dir_entry.slice(0x18, 0x1e);
    this.file_size_in_sectors = dir_entry[0x1e] + (dir_entry[0x1f] * 256);
    return this;
}

const file_type_text = [
    'DEL', 'SEQ', 'PRG', 'USR', 'REL',
]

FileEntry.prototype.file_type_txt = function () {
    const actual = this.file_type & 0b111;
    return file_type_text[actual] || actual;
}

function read_directory(disk) {
    const files = [];
    let dir_sector = get_sector(disk, 18, 1);
    let next_sector = true;
    while (next_sector) {
        next_sector = false;
        let offset = 0;
        let next_file = true;
        while (next_file) {
            next_file = false;
            const file = new FileEntry(dir_sector.slice(offset, offset + 0x20));
            files.push(file);
            if (offset < 0xe0) {
                offset += 0x20;
                next_file = true;
            }
        }
        const t_link = dir_sector[0];
        const s_link = dir_sector[1];
        if (t_link > 0) {
            dir_sector = get_sector(disk, t_link, s_link);
            next_sector = true;
        }
    }
    return files;
}

function BAM(disk) {
    const bam_sector = get_sector(disk, 18, 0);
    this.dir_track = bam_sector[0];
    this.dir_sector = bam_sector[1];
    this.dos_version = bam_sector[2];
    this.disk_name = fn_trim(bam_sector.slice(0x90, 0xa0).toString());
    this.disk_id = bam_sector.slice(0xa2, 0xa4);
    this.dos_type = bam_sector.slice(0xa5, 0xa7).toString();
}

function read(filename) {
    const disk = fs.readFileSync(filename);
    return new DiskImage(disk);
}

function leftpad(s, n) {
    s = s.toString();
    while (s.length < n) {
        s = s + ' ';
    }
    return s;
}


function DiskImage(disk) {
    this.buffer = disk;
    this.bam = new BAM(disk);
    this.files = read_directory(disk);
    return this;
}

DiskImage.prototype.print_directory = function() {
    console.log('0 "' + leftpad(this.bam.disk_name,16) + '" ' + this.bam.disk_id + ' ' + this.bam.dos_type);
    for (file of this.files) {
        if (file.file_type === 0) {
            continue;
        }
        console.log(leftpad(file.file_size_in_sectors,5) + leftpad('"' + file.filename + '"',19) + file.file_type_txt());
    }
}

DiskImage.prototype.load_contents = function (file) {
    let sector = get_sector(this.buffer, file.t_first_sector, file.s_first_sector);
    const sectors = [];
    while (sector[0] > 0) {
        sectors.push(sector.slice(2, 256));
        sector = get_sector(this.buffer, sector[0], sector[1]);
    }
    sectors.push(sector.slice(2, sector[1]));
    // console.log('we have ' + sectors.length + ' of ' + file.file_size_in_sectors);
    return Buffer.concat(sectors);
}


DiskImage.prototype.load = function (fn) {
    for (file of this.files) {
        if (file.filename === fn) {
            return this.load_contents(file);
        }
    }
}

module.exports = {
    read
}
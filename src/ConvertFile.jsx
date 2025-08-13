import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

function ConvertFile() {
    const [jsonData, setJsonData] = useState([]);
    const [icsData, setIcsData] = useState('');
    const [fileName, setFileName] = useState('schedule.ics');

    // TODO: hash fields since the order of fields might change
    const handleFileInput = async(e) => {
        console.log('reading input file:');
        const file = e.target.files[0];
        console.log(file.name)
        if (file) {
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            setFileName(baseName + '.ics');
        }
        
        const data =  await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const parsed = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
        });

        const headerRowIndex = 2;
        const headers = parsed[headerRowIndex];

        const dataRows = parsed.splice(headerRowIndex+1)
        const mappedData = dataRows.map(row => {
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = row[i] ? row[i].toString().trim() : "";
            });
            return obj;
          });
    
        //console.log(e.target.files[0]);
        // console.log(workbook);
        console.log(mappedData);
        // console.log(excelSerialDateToICS(45672))
        setJsonData(mappedData);
    };
    // Converts Excel Serial Datetime (e.g., "12:00 PM") to 24-hour format "HHMMSS"
    const excelSerialDateToICS = (excelSerialDate) => {
        const date = new Date(Date.UTC(0, 0, excelSerialDate - 1));
        const pad = n => n.toString().padStart(2, '0');
        return (
            date.getUTCFullYear().toString() +
            pad(date.getUTCMonth() + 1) +
                    pad(date.getUTCDate()) 
        )
    }

    // Converts Excel time (e.g., "12:00 PM") to 24-hour format "HHMMSS"
    const excelTimeToICS = (timeStr) => {
        if (!timeStr) return "000000";
        // Remove whitespace and AM/PM
        const [time, modifier] = timeStr.trim().split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier && modifier.toUpperCase() === 'PM' && hours !== 12) {
            hours += 12;
        }
        if (modifier && modifier.toUpperCase() === 'AM' && hours === 12) {
            hours = 0;
        }
        return (
            hours.toString().padStart(2, '0') +
            minutes.toString().padStart(2, '0') +
            "00"
        );
    }
    // "Monday/Wednesday/Friday | 12:00 PM - 12:50 PM | Briggs 108 Classroom"
    const getMeetingPattern = (pattern, startDate, endDate) => {
        if (!pattern) return [];
        const [daysOfWeek, classHour, location] = pattern.split('|').map(s => s.trim());
        const daysOfWeekList = daysOfWeek
            .split('/')
            .map(s => s.trim().slice(0, 2).toUpperCase());
        const [startHour, endHour] = classHour.split('-').map(s => s.trim())
        const startTime = startDate + 'T' + excelTimeToICS(startHour)
        const endTime = startDate + 'T'+ excelTimeToICS(endHour)

        const result = [];
        if (location) result.push(`LOCATION:${location}`);
        result.push(`DTSTART:${startTime}`);
        result.push(`DTEND:${endTime}`);
        result.push(`RRULE:FREQ=WEEKLY;BYDAY=${daysOfWeekList.join(',')};UNTIL=${endDate}+T235959Z`);
        return result;
    }
    /* Info index
        "1 - Course Listing",
        "4 - Course Listing + Section",
        "5 - Instructional Format",
        "6 - Delivery Mode",
        "7 - Meeting Patterns", ex: "Monday/Wednesday/Friday | 12:00 PM - 12:50 PM | Briggs 108 Classroom\n\n"
        "9 - Instructor",
        "10 - Start Date",
        "11 - End Date"
    */
    const convertJsonToIcs = () => {
        const icsContent = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Jessie R27 - Rhodes College//Schedule Converter v1.0//EN",
            "\n"
        ];
        for (const course of jsonData) {
            const courseListing = course["Section"];
            const startDate = excelSerialDateToICS(course["Start Date"]);
            const endDate = excelSerialDateToICS(course["End Date"]);
            const meetingPatterns = course["Meeting Patterns"].split(/\n+/).filter(Boolean);
            for (let j = 0; j < meetingPatterns.length; j++) {
                icsContent.push("BEGIN:VEVENT");
                const UID = `${courseListing.replace(/\s+/g, '') || 'unknown'}-${startDate}-${j}@rhodes.edu`.toLowerCase();
                icsContent.push(`UID:${UID}`);
                icsContent.push(`SUMMARY:${courseListing}`);
                const description = ""; // TODO: add more details if needed
                // icsContent.push(`DESCRIPTION:${description}`);
                icsContent.push(...getMeetingPattern(meetingPatterns[j], startDate, endDate));
                icsContent.push("END:VEVENT");
                icsContent.push("\n");
            }
        }
        icsContent.push("END:VCALENDAR");
        return icsContent.join('\n');
    };
    const handleIcsFileDownload = () => {
        const blob = new Blob([icsData], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    useEffect(() => {
        if (jsonData) {
            // Convert jsonData to ICS format here
            const ics = convertJsonToIcs();
            console.log(ics)
            setIcsData(ics);
        }
      }, [jsonData]);

    return (
        <div>
            <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileInput}
            />
            {/* TODO download button still showing */}
            {icsData != '' && (
                <button onClick={handleIcsFileDownload}>Download ICS</button>
            )}
        </div>
    );
}
export default ConvertFile;
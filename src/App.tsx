import {useState, useEffect} from 'react';
import type {FormEvent} from 'react';
import './App.css';

type Shift={
  id:number,
  job: string,
  date?:string,
  startTime: string,
  endTime:string;
};

const initialShifts:Shift[]=[
  {id:1,job:"Cashier", startTime:'15:00',endTime:'21:30'},
  {id:2,job:"Server",startTime:'10:00',endTime:'13:00'}
];


function timeToMinutes(time: string):number{
  const [hours,minutes]= time.split(':').map(Number);
  return hours*60 +minutes;
}

function toDateKey(date:Date):string{
  const year= date.getFullYear();
  const month= String(date.getMonth()+1).padStart(2,'0');
  const day= String(date.getDate()).padStart(2,'0');

  return `${year}-${month}-${day}`;
}
 
function getCurrentWeek(){
  const monday= new Date();
  const daysSinceMonday= (monday.getDay()+6)%7;

  monday.setDate(monday.getDate()-daysSinceMonday);

  const sunday= new Date(monday);
  sunday.setDate(sunday.getDate()+6);

  return {start: toDateKey(monday),end:toDateKey(sunday)};
}

export default function App(){
  const [shifts, setShifts]= useState<Shift[]> (()=>{
    try{
      const savedShifts= localStorage.getItem('shift-ledger-shifts');

      if(savedShifts== null){
        return initialShifts;
      }
      return JSON.parse(savedShifts);
    }
    catch{
      return initialShifts;
    }
  });

  useEffect(()=> {
    localStorage.setItem('shift-ledger-shifts',JSON.stringify(shifts));
  },[shifts]);
  
  const {start,end}= getCurrentWeek();
  const weeklyShifts= shifts.filter((shift)=>{
    if(!shift.date){
      return false;
    }
    return shift.date>= start && shift.date<=end;
  });

  const [weeklyLimit, setWeeklyLimit]=useState(()=>{
    return localStorage.getItem('shift-ledger-weekly-limit')??'24';
  });

  useEffect(()=>{
    localStorage.setItem('shift-ledger-weekly-limit',weeklyLimit);
  },[weeklyLimit]);

  let totalMinutes=0;
  
  for (const shift of weeklyShifts){ 
  const duration= timeToMinutes(shift.endTime) - timeToMinutes(shift.startTime);
    totalMinutes+=duration;
  }
  const hours= Math.floor(totalMinutes/60);
  const minutes= totalMinutes % 60;

  const limitHours= Number(weeklyLimit);
  const hasValidLimit= weeklyLimit.trim()!=='' && Number.isFinite(limitHours) &&limitHours>=0;

  const difference= Math.round(limitHours*60)- totalMinutes;
  const differenceHours= Math.floor(Math.abs(difference)/60);
  const differenceMinutes= Math.abs(difference) %60;

  function handleAddShift(event: FormEvent <HTMLFormElement>){
    event.preventDefault();
    const form = event.currentTarget;
    const data= new FormData(form);
    const job= String (data.get('job')??'').trim();
    const date= String(data.get('date')??'');
    const startTime= String(data.get('startTime')??'');
    const endTime= String(data.get('endTime')??'');

    if(!job ||!date || !startTime || !endTime){
      window.alert('Please fill in three fields.');
      return;
    }
    if(timeToMinutes(endTime)<=timeToMinutes(startTime)){
      window.alert('End time must be after start time for a same day shift.');
      return;
    }

    setShifts((currentShifts)=>{
        const nextId= Math.max(0,...currentShifts.map((shift)=>shift.id))+1;
        const  newShift:Shift= {id:nextId, job,date, startTime,endTime};
        return [...currentShifts,newShift];
    });

  }

  function handleDeleteShift(id:number){
    setShifts((currentShifts)=>
    currentShifts.filter((shift)=>shift.id!=id));
  }

return (
  <main className='shift-ledger'>
  <h1>ShiftLedger</h1>
  <form onSubmit={handleAddShift} className='shift-form'>
    <label>
      Job
      <input name= "job" type="text" required/>
    </label>
    <label>
      Date 
      <input name= "date" type= "date" required/> 
    </label>
    <label>
      Start time 
      <input name= "startTime" type= "time" required/> 
    </label>
    <label>
      End time 
      <input name="endTime" type="time" required/>
    </label>

    <button type='submit'>Add Shift</button>
  </form>
  <p> This week ({start} to {end}): {hours} h {minutes} min </p>
  <label>
    Weekly Limit (hours)
    <input 
    type='number' min='0' step='0.5' value={weeklyLimit}
    onChange={(event)=>setWeeklyLimit(event.currentTarget.value)}/>
  </label>
  {hasValidLimit &&(
    <p className={difference<0 ?'limit-status over-limit':'limit status'}>
      {difference<0? 'Over limit':'Time remaining'}:{' '}
      {differenceHours} h {differenceMinutes} min
    </p>
  )}
  <h2>Scheduled shifts</h2>
  <ul className='shift-list'>
    {shifts.map((shift)=>(
      <li key={shift.id}>{shift.job}. {shift.date?? 'No date set'}. {shift.startTime} to {shift.endTime}
      <button type='button' onClick={()=>handleDeleteShift(shift.id)}>Delete</button>
      </li>
    ))}
  </ul>
  </main>
);
}
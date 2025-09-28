import * as React from "react"
 
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
 

function MySelect({ options }) {

  return (
    <div>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
    </div>
  );
}

export function DropDownForm(props) {

  const { title, list, onChange } = props;

  return (
    <Select onValueChange={onChange}>
      <SelectTrigger className="w-[100px]">
        <SelectValue placeholder={title} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{ title }</SelectLabel>
          <MySelect options={list}/>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

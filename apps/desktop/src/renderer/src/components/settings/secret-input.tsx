import { useState } from "react"
import { RiEyeLine, RiEyeOffLine } from "@remixicon/react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from "@/components/ui/input-group"

export function SecretInput({
  value,
  onChange,
  placeholder,
  id,
  autoFocus
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
  autoFocus?: boolean
}) {
  const [visible, setVisible] = useState(false)

  return (
    <InputGroup className="h-9 rounded-2lg border-border-button-default bg-background-primary-default shadow-xs dark:bg-transparent">
      <InputGroupInput
        id={id}
        autoFocus={autoFocus}
        type={visible ? "text" : "password"}
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="text-body-medium text-text-primary"
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label={visible ? "Hide API key" : "Show API key"}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <RiEyeOffLine className="size-4" /> : <RiEyeLine className="size-4" />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}

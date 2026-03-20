import { Badge } from './Badge'
import { ItemStatus, ItemType, OperationType, ITEM_STATUS_LABELS, OPERATION_TYPE_LABELS } from '../../types'

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  const variants = {
    [ItemStatus.IN_STORAGE]: 'green',
    [ItemStatus.TEMP_EXIT]: 'yellow',
    [ItemStatus.SCRAPPED]: 'red',
    [ItemStatus.DEPLETED]: 'gray',
  } as const

  return <Badge variant={variants[status]}>{ITEM_STATUS_LABELS[status]}</Badge>
}

export function ItemTypeBadge({ type }: { type: ItemType }) {
  const variants = {
    [ItemType.ELECTRONICS_SAMPLE]: 'blue',
    [ItemType.FIXTURE]: 'purple',
    [ItemType.SPARE_PART]: 'orange',
    [ItemType.CONSUMABLE]: 'green',
    [ItemType.MISC]: 'gray',
  } as const

  const labels = {
    [ItemType.ELECTRONICS_SAMPLE]: 'Electronics',
    [ItemType.FIXTURE]: 'Fixture',
    [ItemType.SPARE_PART]: 'Spare Part',
    [ItemType.CONSUMABLE]: 'Consumable',
    [ItemType.MISC]: 'Misc',
  }

  return <Badge variant={variants[type]}>{labels[type]}</Badge>
}

export function OperationBadge({ type }: { type: OperationType }) {
  const variants = {
    [OperationType.RECEIPT]: 'green',
    [OperationType.MOVE]: 'blue',
    [OperationType.TEMP_EXIT]: 'yellow',
    [OperationType.RETURN]: 'purple',
    [OperationType.SCRAP]: 'red',
    [OperationType.CONSUME]: 'orange',
  } as const

  return <Badge variant={variants[type]}>{OPERATION_TYPE_LABELS[type]}</Badge>
}

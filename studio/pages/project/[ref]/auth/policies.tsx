import { PostgresPolicy, PostgresTable } from '@supabase/postgres-meta'
import { PermissionAction } from '@supabase/shared-types/out/constants'
import { partition } from 'lodash'
import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'

import { useParams } from 'common/hooks'
import { Policies } from 'components/interfaces/Auth/Policies'
import { AuthLayout } from 'components/layouts'
import { useProjectContext } from 'components/layouts/ProjectLayout/ProjectContext'
import AlertError from 'components/ui/AlertError'
import NoPermission from 'components/ui/NoPermission'
import { GenericSkeletonLoader } from 'components/ui/ShimmeringLoader'
import { useSchemasQuery } from 'data/database/schemas-query'
import { useTablesQuery } from 'data/tables/tables-query'
import { useCheckPermissions, useStore } from 'hooks'
import { EXCLUDED_SCHEMAS } from 'lib/constants/schemas'
import { useTableEditorStateSnapshot } from 'state/table-editor'
import { NextPageWithLayout } from 'types'
import { Button, IconExternalLink, IconLock, IconSearch, Input, Listbox } from 'ui'

/**
 * Filter tables by table name and policy name
 *
 * @param tables list of table
 * @param policies list of policy
 * @param searchString filter keywords
 *
 * @returns list of table
 */
const onFilterTables = (
  tables: PostgresTable[],
  policies: PostgresPolicy[],
  searchString?: string
) => {
  if (!searchString) {
    return tables.slice().sort((a: PostgresTable, b: PostgresTable) => a.name.localeCompare(b.name))
  } else {
    const filter = searchString.toLowerCase()
    const findSearchString = (s: string) => s.toLowerCase().includes(filter)
    // @ts-ignore Type instantiation is excessively deep and possibly infinite
    const filteredPolicies = policies.filter((p: PostgresPolicy) => findSearchString(p.name))

    return tables
      .slice()
      .filter((x: PostgresTable) => {
        return (
          x.name.toLowerCase().includes(filter) ||
          x.id.toString() === filter ||
          filteredPolicies.some((p: PostgresPolicy) => p.table === x.name)
        )
      })
      .sort((a: PostgresTable, b: PostgresTable) => a.name.localeCompare(b.name))
  }
}

const AuthPoliciesPage: NextPageWithLayout = () => {
  const { project } = useProjectContext()
  const snap = useTableEditorStateSnapshot()
  const { meta } = useStore()
  const { search } = useParams()
  const [searchString, setSearchString] = useState<string>('')

  useEffect(() => {
    if (search) setSearchString(search)
  }, [search])

  const {
    data: schemas,
    isLoading: isLoadingSchemas,
    isSuccess: isSuccessSchemas,
    isError: isErrorSchemas,
    error: errorSchemas,
  } = useSchemasQuery({
    projectRef: project?.ref,
    connectionString: project?.connectionString,
  })
  const [protectedSchemas, openSchemas] = partition(schemas, (schema) =>
    EXCLUDED_SCHEMAS.includes(schema?.name ?? '')
  )
  const schema = schemas?.find((schema) => schema.name === snap.selectedSchemaName)
  const isLocked = protectedSchemas.some((s) => s.id === schema?.id)

  const policies = meta.policies.list()

  const {
    data: tables,
    isLoading,
    isSuccess,
    isError,
    error,
  } = useTablesQuery({
    projectRef: project?.ref,
    connectionString: project?.connectionString,
    schema: snap.selectedSchemaName,
  })

  const filteredTables = onFilterTables(tables ?? [], policies, searchString)

  const canReadPolicies = useCheckPermissions(PermissionAction.TENANT_SQL_ADMIN_READ, 'policies')

  if (!canReadPolicies) {
    return <NoPermission isFullPage resourceText="view this project's RLS policies" />
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-[230px]">
              {isLoadingSchemas && (
                <div className="h-[34px] w-full bg-scale-1000 rounded shimmering-loader" />
              )}

              {isErrorSchemas && (
                <AlertError error={errorSchemas} subject="Failed to retrieve schemas" />
              )}

              {isSuccessSchemas && (
                <Listbox
                  size="small"
                  value={snap.selectedSchemaName}
                  onChange={(schema: string) => {
                    snap.setSelectedSchemaName(schema)
                    setSearchString('')
                  }}
                  icon={isLocked && <IconLock size={14} strokeWidth={2} />}
                >
                  <Listbox.Option
                    disabled
                    key="normal-schemas"
                    value="normal-schemas"
                    label="Schemas"
                  >
                    <p className="text-sm">Schemas</p>
                  </Listbox.Option>
                  {openSchemas.map((schema) => (
                    <Listbox.Option
                      key={schema.id}
                      value={schema.name}
                      label={schema.name}
                      addOnBefore={() => <span className="text-scale-900">schema</span>}
                    >
                      <span className="text-scale-1200 text-sm">{schema.name}</span>
                    </Listbox.Option>
                  ))}
                  <Listbox.Option
                    disabled
                    key="protected-schemas"
                    value="protected-schemas"
                    label="Protected schemas"
                  >
                    <p className="text-sm">Protected schemas</p>
                  </Listbox.Option>
                  {protectedSchemas.map((schema) => (
                    <Listbox.Option
                      key={schema.id}
                      value={schema.name}
                      label={schema.name}
                      addOnBefore={() => <span className="text-scale-900">schema</span>}
                    >
                      <span className="text-scale-1200 text-sm">{schema.name}</span>
                    </Listbox.Option>
                  ))}
                </Listbox>
              )}
            </div>
            <Input
              size="small"
              placeholder="Filter tables and policies"
              className="block w-64 text-sm placeholder-gray-400"
              value={searchString}
              onChange={(e) => setSearchString(e.target.value)}
              icon={<IconSearch size="tiny" />}
            />
          </div>
          <a
            target="_blank"
            rel="noreferrer"
            href="https://supabase.com/docs/learn/auth-deep-dive/auth-row-level-security"
          >
            <Button type="link" icon={<IconExternalLink size={14} strokeWidth={1.5} />}>
              What is RLS?
            </Button>
          </a>
        </div>
      </div>
      {isLoading && <GenericSkeletonLoader />}
      {isError && <AlertError error={error} subject="Failed to retrieve tables" />}
      {isSuccess && (
        <Policies tables={filteredTables} hasTables={tables.length > 0} isLocked={isLocked} />
      )}
    </div>
  )
}

AuthPoliciesPage.getLayout = (page) => (
  <AuthLayout title="Auth">
    <div className="h-full p-4">{page}</div>
  </AuthLayout>
)

export default observer(AuthPoliciesPage)

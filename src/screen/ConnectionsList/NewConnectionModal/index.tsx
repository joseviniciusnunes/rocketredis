import { FormHandles } from '@unform/core'
import { Form } from '@unform/web'
import React, { useRef, useCallback, memo } from 'react'
import { FiActivity, FiSave } from 'react-icons/fi'
import { useToggle } from 'react-use'
import { useSetRecoilState } from 'recoil'
import * as Yup from 'yup'

import { connectionsState } from '../../../atoms/connections'
import Button from '../../../components/Button'
import Input from '../../../components/Form/Input'
import Modal, { SharedModalProps } from '../../../components/Modal'
import { useToast } from '../../../context/toast'
import { saveAndGetConnections } from '../../../services/connection/SaveConnectionService'
import { testConnection } from '../../../services/connection/TestConnectionService'
import getValidationErrors from '../../../utils/getValidationErrors'
import {
  ActionsContainer,
  ButtonGroup,
  InputGroup,
  TestConnectionButton
} from './styles'

interface ConnectionFormData {
  name: string
  host: string
  port: string
  password: string
}

const NewConnectionModal: React.FC<SharedModalProps> = ({
  visible,
  onRequestClose
}) => {
  const formRef = useRef<FormHandles>(null)
  const { addToast } = useToast()
  const setConnections = useSetRecoilState(connectionsState)

  const [testConnectionLoading, toggleTestConnectionLoading] = useToggle(false)
  const [createConnectionLoading, toggleCreateConnectionLoading] = useToggle(
    false
  )

  const handleCreateConnection = useCallback(
    async (data: ConnectionFormData) => {
      try {
        formRef.current?.setErrors({})

        const schema = Yup.object().shape({
          name: Yup.string().required(),
          host: Yup.string().required(),
          port: Yup.number().required(),
          password: Yup.string()
        })

        toggleCreateConnectionLoading()

        await schema.validate(data, {
          abortEarly: false
        })

        const { name, host, port, password } = data

        try {
          const connections = saveAndGetConnections({
            name,
            host,
            port: Number(port),
            password
          })

          setConnections(connections)

          addToast({
            type: 'success',
            title: 'Connection saved',
            description: 'You can now connect to your database!'
          })

          handleCloseModal()
        } catch (err) {
          addToast({
            type: 'error',
            title: 'Error saving connection',
            description: err.message || 'Unexpected error occurred, try again.'
          })
        }
      } catch (err) {
        if (err instanceof Yup.ValidationError) {
          const errors = getValidationErrors(err)

          formRef.current?.setErrors(errors)
        }
      } finally {
        toggleCreateConnectionLoading()
      }
    },
    []
  )

  const handleTestConnection = useCallback(async () => {
    if (!formRef.current) {
      return
    }

    const {
      host,
      port,
      password
    } = formRef.current.getData() as ConnectionFormData

    try {
      formRef.current?.setErrors({})
      toggleTestConnectionLoading()
      const schema = Yup.object().shape({
        host: Yup.string().required(),
        port: Yup.number().required(),
        password: Yup.string()
      })
      const data = {
        host,
        port
      }

      await schema.validate(data, {
        abortEarly: false
      })

      await testConnection({
        host,
        port: Number(port),
        password
      })

      addToast({
        type: 'success',
        title: 'Connection successful',
        description: 'Urrray... You can save your connection now!'
      })
    } catch (err) {
      if (err instanceof Yup.ValidationError) {
        const errors = getValidationErrors(err)
        formRef.current?.setErrors(errors)
      } else {
        addToast({
          type: 'error',
          title: 'Error on connection',
          description: 'Error estabilishing connection with your Redis server'
        })
      }
    } finally {
      toggleTestConnectionLoading()
    }
  }, [])

  const handleCloseModal = useCallback(() => {
    if (onRequestClose) {
      onRequestClose()
    }
  }, [])

  return (
    <Modal visible={visible} onRequestClose={onRequestClose}>
      <h1>New connection</h1>

      <Form
        initialData={{
          host: 'localhost',
          port: '6379'
        }}
        ref={formRef}
        onSubmit={handleCreateConnection}
      >
        <Input name="name" label="Connection name" />

        <InputGroup>
          <Input name="host" label="Host" />
          <Input name="port" label="Port" />
        </InputGroup>

        <Input
          type="password"
          name="password"
          label="Password"
          hint="Leave empty for no password"
        />

        <ActionsContainer>
          <TestConnectionButton
            loading={testConnectionLoading}
            color="pink"
            onClick={handleTestConnection}
          >
            <FiActivity />
            Test connection
          </TestConnectionButton>

          <ButtonGroup>
            <Button onClick={handleCloseModal} type="button" color="opaque">
              Cancel
            </Button>
            <Button
              loading={createConnectionLoading}
              type="submit"
              color="purple"
            >
              <FiSave />
              Save
            </Button>
          </ButtonGroup>
        </ActionsContainer>
      </Form>
    </Modal>
  )
}

export default memo(NewConnectionModal)

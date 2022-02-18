import {getInput, info} from '@actions/core'
import {context} from '@actions/github'

const {ref} = context
const token = getInput('token')

info(JSON.stringify({ref, token}))

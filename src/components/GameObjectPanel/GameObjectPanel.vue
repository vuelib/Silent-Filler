<template>
  <div :style="_getPanelStyle">
    <side-panel
      @panelClosed="_onPanelClosed"
      background="#efefef" direction="horizontal-right" main-panel-class="shadow-lg">
      <div>
        <div class="d-flex justify-content-start">
          <icon-button class="m-2" btnIconName="plus-circle" variant="outline-primary" size="lg"
            v-b-tooltip.hover title="Thêm object"
            @click="_addObject" />
          <icon-button class="m-2" btnIconName="trash2" variant="danger" size="lg"
            v-b-tooltip.hover title="Xóa object"
            @click="_deleteSelectedObj"
            :disabled="!_hasObjectSelected" />
        </div>
        <div class="d-flex flex-column">
          <game-object-item
            class="mb-1 m-2"
            v-for="(object, index) in listObjects"
            :key="object.id"
            :game-object="object"
            v-show="_isObjectInCurrentPage(index)"
            @input="_onObjectChanged(index, $event)"
            @selected="_updateSelectedObj(index)"
            @unselected="_onItemUnselected(index)"
            ref="gameObjects"/>
          <b-pagination
            v-show="listObjects.length > 0"
            class="ml-2"
            v-model="currentPage"
            :total-rows.sync="totalRow"
            :per-page="objectPerPage"
            :limit="3"
            ref="pagination">
          </b-pagination>
        </div>
      </div>
    </side-panel>
    <b-modal id="invalid-object-modal">
      <span>Invalid value: <strong>{{ invalidValue }}</strong></span>
    </b-modal>
  </div>
</template>

<script>
import GameObjectItem from './GameObjectItem'
import SidePanel from '../Utilities/SidePanel'
import IconButton from '../Utilities/IconButton'
import { GameObject, StaticObject } from '../MapUtilities'
import { mapState, mapGetters, mapMutations } from 'vuex'

export default {
  name: 'GameObjectPanel',
  components: {
    GameObjectItem, SidePanel, IconButton
  },
  data() {
    return {
      selectedIndex: -1,
      objectPerPage: 3,
      currentPage: 1,
      invalidValue: null,
      totalRow: 0,
      isRowIncreased: true
    }
  },
  watch: {
    tab: function(newVal, oldVal) {
      if (!newVal) {
        return
      }
      this._updateSelectedObj(this.panelData.currentSelectedIndex)
    },
    totalRow: function(newVal) {
      if (this._isNumberOfPageChanged) {
        this._navigateCurrentPage()
      }
    },
    mode: function(newVal, oldVal) {
      if (newVal === this.AVAILABLE_MODE.DRAW_MODE) {
        return
      }
      this._updateSelectedObj(-1)
    },
    listObjects: function(newVal, oldVal) {
      this.isRowIncreased = newVal.length > this.totalRow
      this.totalRow = newVal.length
    },
    activePanel: async function(newVal, oldVal) {
      if (newVal === 1) {
        return
      }
      this._updateSelectedObj(-1)
    }
  },
  created: function() {
    this.listObjects = []
  },
  mounted: function() {
    this.$refs.gameObjects = []
  },
  computed: {
    ...mapState('map-edit', {
      tab: 'currentTab',
      AVAILABLE_MODE: 'AVAILABLE_MODE'
    }),
    ...mapGetters('map-edit', {
      mode: 'mode',
      tabData: 'currentTabData',
      activePanel: 'currentActivePanel'
    }),
    panelData: {
      get() {
        return this.tabData ? this.tabData.staticObjects : null
      }
    },
    listObjects: {
      get () {
        return this.panelData ? this.panelData.objects : []
      },
      set(val) {}
    },
    _autoIncrementTagValue() {
      if (!this.listObjects || this.listObjects.length === 0) {
        return 'S0'
      }
      let tagIndex = Number.parseInt(this.listObjects[this.listObjects.length - 1].tag.slice(1))
      return `S${tagIndex + 1}`
    },
    _selectedObj() {
      return this.listObjects[this.selectedIndex]
    },
    _hasObjectSelected() {
      return this.selectedIndex !== -1
    },
    _isNumberOfPageChanged() {
      return (Math.floor(this.listObjects.length / this.objectPerPage) + 1) !== this.currentPage
    },
    _paginator() {
      return this.$refs.pagination
    },
    _getPanelStyle() {
      return {
        'visibility': this.mode === this.AVAILABLE_MODE.DRAW_MODE ? 'visible' : 'hidden'
      }
    }
  },
  methods: {
    ...mapMutations('map-edit', ['updateActivePanel']),

    _onObjectChanged(objIndex, objVal) {
      let sameObj = this.listObjects.filter((obj, index) =>
        objIndex !== index && (obj.name === objVal.name || obj.tag === objVal.tag))[0]
      if (!sameObj) {
        this._onCurrentObjectChanged(objIndex, objVal)
        return
      }
      if (sameObj.tag === objVal.tag) {
        this._showInvalidObjectValue(objVal.tag)
      } else {
        this._showInvalidObjectValue(objVal.name)
      }
      this.$refs.gameObjects[objIndex].restoreThePreviousValue()
    },
    _updateSelectedObj(index) {
      let selectedObj = this.listObjects[index]
      let preObj = this.$refs.gameObjects[this.selectedIndex]
      let shouldUnselectPreObj = false
      if (index !== this.selectedIndex && this.selectedIndex !== -1) {
        shouldUnselectPreObj = true
      }
      this.selectedIndex = index
      if (shouldUnselectPreObj) {
        preObj.unselect()
      }
      this._onCurrentObjectChanged(index, selectedObj)
    },
    _onItemUnselected(index) {
      if (index !== this.selectedIndex) {
        return
      }
      this.selectedIndex = -1
      this._onCurrentObjectChanged(-1, null)
    },
    _addObject() {
      let tagValue = this._autoIncrementTagValue
      this.panelData.addObject(new StaticObject(
        tagValue,
         `Object ${tagValue}`,
         '#000000'
      ))
      this._onObjectAdded()
    },
    _deleteSelectedObj() {
      if (this.selectedIndex === -1) {
        return
      }
      this.$delete(this.listObjects, this.selectedIndex)
      this.selectedIndex = -1
      this._onObjectDeleted()
    },
    _isObjectInCurrentPage(index) {
      let startIndex = (this.currentPage - 1) * this.objectPerPage
      let endIndex = startIndex + this.objectPerPage - 1
      return index >= startIndex && index <= endIndex
    },
    _onObjectAdded() {
      this.$emit('objects-changed', this.listObjects)
    },
    _onObjectDeleted() {
      this._onCurrentObjectChanged(-1, null)
      this.$emit('objects-changed', this.listObjects)
    },
    _onCurrentObjectChanged(objIndex, obj) {
      if (obj) {
        this.updateActivePanel(1)
      }
      this.panelData.select(objIndex)
      this.$emit('current-object-changed', objIndex, obj)
    },
    _showInvalidObjectValue(obj) {
      this.invalidValue = obj
      this.$bvModal.show('invalid-object-modal')
    },
    _navigateCurrentPage() {
      let isLastObjOfPage = this.listObjects.length !== 0 && this.listObjects.length % this.objectPerPage === 0
      let updatedLastPage = Math.floor(this.listObjects.length / this.objectPerPage) + (isLastObjOfPage ? 0 : 1)
      let paginationCurrentPage = this.$refs.pagination.$data.localNumberOfPages

      // A page has just been deleted
      if (updatedLastPage < paginationCurrentPage) {
        // The current page value is the deleted page => go to last updated page
        if (this.currentPage === paginationCurrentPage) {
          this._paginator.$data.localNumberOfPages--
          this.currentPage = this._paginator.$data.localNumberOfPages
        }
        // else stay at the current page
      } else {
        // A new page has just been added => navigate to last page of paginator
        if (updatedLastPage === paginationCurrentPage + 1) {
          this._paginator.$data.localNumberOfPages++
          this.currentPage = this._paginator.$data.localNumberOfPages
        }
      }
    },
    _onPanelClosed(e) {
      this.panelData.select(-1)
    }
  }
}
</script>

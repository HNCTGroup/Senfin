package forms

case class SensorData(
	sensorUri: String,
	lssId: Int,
	sds: Int
)

case class SensorVerification(
	valLow : BigDecimal,
	valHigh : BigDecimal,
	time: Int,
	sensors: List[SensorData],
	numItems: Int
)

import models._
import play.api.data._
import play.api.data.Forms._

object SensorVerificationForm {
	
  def apply() = {
    Form(
        mapping(
            "valLow" -> bigDecimal,
            "valHigh" -> bigDecimal,
            "time" -> number,
            "sensors" -> list(mapping(
                "sensorUri" -> text,
                "lssId" -> number,
                "sds" -> number
            )(SensorData.apply)(SensorData.unapply)),
            "numItems" -> number
        )(SensorVerification.apply)(SensorVerification.unapply)
    )
  }
  
}